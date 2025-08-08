-- Fix RLS infinite recursion on event_organizers by using SECURITY DEFINER helpers

-- 1) Replace is_event_leader with SECURITY DEFINER to bypass RLS during policy evaluation
CREATE OR REPLACE FUNCTION public.is_event_leader(event UUID, uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_organizers
    WHERE event_id = event AND user_id = uid AND role = 'leader'
  );
$$;

-- 2) New helper: check if a user is a team member of an event (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.user_is_event_team_member(p_event_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_organizers
    WHERE event_id = p_event_id AND user_id = p_user_id
  );
$$;

-- 3) Recreate SELECT policy to avoid self-select recursion
DROP POLICY IF EXISTS "Team can view event organizers" ON public.event_organizers;
CREATE POLICY "Team can view event organizers" ON public.event_organizers
FOR SELECT USING (
  -- Anyone can view organizers of published events
  EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = event_id AND e.status = 'published'
  )
  OR public.user_is_event_team_member(event_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- 4) Ensure manage/delete policies rely on SECURITY DEFINER function
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


