-- Multi-organizers (leader/members), participation and organizer points
-- This migration is idempotent where possible and assumes RLS is enabled on tables by default.

-- 1) Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organizer_role') THEN
    CREATE TYPE public.organizer_role AS ENUM ('leader','member');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'point_kind') THEN
    CREATE TYPE public.point_kind AS ENUM ('participation','organizer');
  END IF;
END $$;

-- 2) Tables
CREATE TABLE IF NOT EXISTS public.event_organizers (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  role public.organizer_role NOT NULL,
  added_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_organizers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  kind public.point_kind NOT NULL,
  points INTEGER NOT NULL CHECK (points > 0),
  earned_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(user_id)
);

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

-- Prevent duplicate participation points per (user,event)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'unique_participation_per_event'
  ) THEN
    ALTER TABLE public.user_points
    ADD CONSTRAINT unique_participation_per_event
      UNIQUE NULLS NOT DISTINCT (user_id, event_id, kind)
      DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.organizer_point_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  points INTEGER NOT NULL CHECK (points >= 0),
  allocated_by UUID NOT NULL REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, recipient_user_id)
);

ALTER TABLE public.organizer_point_allocations ENABLE ROW LEVEL SECURITY;

-- 3) Bootstrap existing events.organizer_id into event_organizers as leader
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT e.id AS event_id, e.organizer_id AS user_id
    FROM public.events e
    LEFT JOIN public.event_organizers eo ON eo.event_id = e.id AND eo.role = 'leader'
    WHERE eo.event_id IS NULL
  ) LOOP
    INSERT INTO public.event_organizers(event_id, user_id, role, added_by)
    VALUES(r.event_id, r.user_id, 'leader', r.user_id)
    ON CONFLICT (event_id, user_id) DO NOTHING;
  END LOOP;
END $$;

-- 4) Functions

-- Helper: is_admin
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN AS $$
  SELECT public.has_role(uid, 'admin');
$$ LANGUAGE SQL STABLE;

-- Check a user's role for an event
CREATE OR REPLACE FUNCTION public.is_event_leader(event UUID, uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_organizers
    WHERE event_id = event AND user_id = uid AND role = 'leader'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Count checked-in participants for an event
CREATE OR REPLACE FUNCTION public.checked_in_count(p_event_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::int
  FROM public.event_registrations
  WHERE event_id = p_event_id AND checked_in_at IS NOT NULL;
$$ LANGUAGE SQL STABLE;

-- Trigger: grant participation point when checked_in_at flips from NULL to non-NULL
CREATE OR REPLACE FUNCTION public.grant_participation_point()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') AND NEW.checked_in_at IS NOT NULL AND (OLD.checked_in_at IS NULL) THEN
    INSERT INTO public.user_points(user_id, event_id, kind, points, earned_reason, created_by)
    VALUES(NEW.user_id, NEW.event_id, 'participation', 1, 'checked_in', NEW.checked_in_by)
    ON CONFLICT ON CONSTRAINT unique_participation_per_event DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_grant_participation_point'
  ) THEN
    CREATE TRIGGER trg_grant_participation_point
    AFTER UPDATE ON public.event_registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.grant_participation_point();
  END IF;
END $$;

-- Allocation function: leader/admin assigns organizer points
CREATE OR REPLACE FUNCTION public.allocate_organizer_points(p_event_id UUID, p_allocations JSONB)
RETURNS VOID AS $$
DECLARE
  caller UUID := auth.uid();
  pool_size INTEGER;
  sum_points INTEGER := 0;
  rec JSONB;
BEGIN
  IF NOT (public.is_event_leader(p_event_id, caller) OR public.is_admin(caller)) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT public.checked_in_count(p_event_id) INTO pool_size;

  -- Accumulate points
  FOR rec IN SELECT * FROM jsonb_array_elements(p_allocations) LOOP
    sum_points := sum_points + COALESCE((rec->>'points')::int, 0);
  END LOOP;

  IF sum_points <> pool_size THEN
    RAISE EXCEPTION 'allocation sum % must equal pool size %', sum_points, pool_size;
  END IF;

  -- Upsert each row
  FOR rec IN SELECT * FROM jsonb_array_elements(p_allocations) LOOP
    INSERT INTO public.organizer_point_allocations(event_id, recipient_user_id, points, allocated_by)
    VALUES (p_event_id, (rec->>'user_id')::uuid, GREATEST(0, (rec->>'points')::int), caller)
    ON CONFLICT (event_id, recipient_user_id) DO UPDATE
      SET points = EXCLUDED.points,
          allocated_by = caller,
          created_at = now();
  END LOOP;

  -- Mirror allocations into user_points as organizer kind for easier aggregation (1 row per recipient)
  -- We keep them in sync by replacing corresponding organizer kind rows for the event
  DELETE FROM public.user_points
   WHERE kind = 'organizer' AND event_id = p_event_id;

  INSERT INTO public.user_points(user_id, event_id, kind, points, earned_reason, created_by)
  SELECT recipient_user_id, p_event_id, 'organizer', points, 'leader_allocation', caller
  FROM public.organizer_point_allocations
  WHERE event_id = p_event_id AND points > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get my points totals (current user)
CREATE OR REPLACE FUNCTION public.get_my_points_totals()
RETURNS TABLE(
  user_id UUID,
  participation_points INTEGER,
  organizer_points INTEGER,
  total_points INTEGER
) AS $$
  SELECT
    auth.uid() AS user_id,
    COALESCE(SUM(CASE WHEN kind = 'participation' THEN points END),0)::int AS participation_points,
    COALESCE(SUM(CASE WHEN kind = 'organizer' THEN points END),0)::int AS organizer_points,
    COALESCE(SUM(points),0)::int AS total_points
  FROM public.user_points
  WHERE user_id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Admin: all users totals (include users with 0 points)
CREATE OR REPLACE FUNCTION public.admin_get_all_points_totals()
RETURNS TABLE(
  user_id UUID,
  participation_points INTEGER,
  organizer_points INTEGER,
  total_points INTEGER
) AS $$
  SELECT
    p.user_id,
    COALESCE(SUM(CASE WHEN up.kind = 'participation' THEN up.points END), 0)::int AS participation_points,
    COALESCE(SUM(CASE WHEN up.kind = 'organizer' THEN up.points END), 0)::int AS organizer_points,
    COALESCE(SUM(up.points), 0)::int AS total_points
  FROM public.profiles p
  LEFT JOIN public.user_points up ON up.user_id = p.user_id
  GROUP BY p.user_id
  ORDER BY total_points DESC, participation_points DESC;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Allow execution from client roles
GRANT EXECUTE ON FUNCTION public.admin_get_all_points_totals() TO anon, authenticated;

-- 5) RLS Policies

-- event_organizers policies
DROP POLICY IF EXISTS "Team can view event organizers" ON public.event_organizers;
CREATE POLICY "Team can view event organizers" ON public.event_organizers
FOR SELECT USING (
  -- Anyone can view organizers of published events
  EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = event_id AND e.status = 'published'
  )
  OR EXISTS (
    SELECT 1 FROM public.event_organizers eo2
    WHERE eo2.event_id = event_id AND eo2.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Leader can manage organizers" ON public.event_organizers;
CREATE POLICY "Leader can manage organizers" ON public.event_organizers
FOR INSERT WITH CHECK (
  public.is_event_leader(event_id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.organizer_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Leader can delete organizers" ON public.event_organizers;
CREATE POLICY "Leader can delete organizers" ON public.event_organizers
FOR DELETE USING (
  public.is_event_leader(event_id, auth.uid()) OR public.has_role(auth.uid(),'admin')
);

-- user_points policies
DROP POLICY IF EXISTS "Users can view own points" ON public.user_points;
CREATE POLICY "Users can view own points" ON public.user_points
FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only server functions can insert points" ON public.user_points;
CREATE POLICY "Only server functions can insert points" ON public.user_points
FOR INSERT WITH CHECK (
  -- restrict direct client inserts; allow security definer functions by bypassing RLS
  false
);

-- organizer_point_allocations policies
DROP POLICY IF EXISTS "Team can view allocations" ON public.organizer_point_allocations;
CREATE POLICY "Team can view allocations" ON public.organizer_point_allocations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.event_organizers eo2
    WHERE eo2.event_id = organizer_point_allocations.event_id AND eo2.user_id = auth.uid()
  ) OR public.has_role(auth.uid(),'admin')
);

DROP POLICY IF EXISTS "Leader can manage allocations" ON public.organizer_point_allocations;
CREATE POLICY "Leader can manage allocations" ON public.organizer_point_allocations
FOR ALL USING (
  public.is_event_leader(event_id, auth.uid()) OR public.has_role(auth.uid(),'admin')
) WITH CHECK (
  public.is_event_leader(event_id, auth.uid()) OR public.has_role(auth.uid(),'admin')
);

-- Allow admins full access on new tables
DO $$ BEGIN
  PERFORM 1;
  -- event_organizers admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_organizers' AND policyname = 'Admins can do anything on event_organizers'
  ) THEN
    CREATE POLICY "Admins can do anything on event_organizers" ON public.event_organizers
    FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
  END IF;
  -- user_points admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_points' AND policyname = 'Admins can view all points'
  ) THEN
    CREATE POLICY "Admins can view all points" ON public.user_points FOR SELECT USING (public.has_role(auth.uid(),'admin'));
  END IF;
  -- organizer_point_allocations admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizer_point_allocations' AND policyname = 'Admins can do anything on allocations'
  ) THEN
    CREATE POLICY "Admins can do anything on allocations" ON public.organizer_point_allocations
    FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
  END IF;
END $$;


