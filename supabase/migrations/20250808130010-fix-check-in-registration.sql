-- Ensure check-in works by adding missing columns (if any) and hardening the RPC
-- This migration is idempotent and safe to re-run.

BEGIN;

-- Add columns that the RPC expects, if they don't already exist
ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_by UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Recreate function with explicit search_path and same permission checks
CREATE OR REPLACE FUNCTION public.check_in_registration(p_registration_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_current_user UUID := auth.uid();
  v_current_status public.registration_status;
BEGIN
  -- Ensure the registration exists and fetch event id and status
  SELECT event_id, status INTO v_event_id, v_current_status
  FROM public.event_registrations
  WHERE id = p_registration_id;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'registration not found';
  END IF;

  -- Permission: any event organizer team member (leader or member), original event owner, or admin
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.event_organizers eo
      WHERE eo.event_id = v_event_id AND eo.user_id = v_current_user
    )
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = v_event_id AND e.organizer_id = v_current_user
    )
    OR public.has_role(v_current_user, 'admin')
  ) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  -- Only allow check-in from approved/paid statuses; idempotent for checked_in
  IF v_current_status NOT IN ('approved', 'paid') THEN
    IF v_current_status = 'checked_in' THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'invalid status for check-in: %', v_current_status;
  END IF;

  -- Perform the update
  UPDATE public.event_registrations
  SET status = 'checked_in',
      checked_in_at = now(),
      checked_in_by = v_current_user,
      updated_at = now()
  WHERE id = p_registration_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_in_registration(UUID) TO anon, authenticated;

COMMIT;


