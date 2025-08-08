-- RPC helpers: find_user_id_by_email and secure check-in

-- Find a user's UUID by email (case-insensitive)
CREATE OR REPLACE FUNCTION public.find_user_id_by_email(p_email TEXT)
RETURNS UUID AS $$
  SELECT u.id
  FROM auth.users u
  WHERE lower(u.email) = lower(p_email)
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Securely mark a registration as checked-in by an organizer or admin
CREATE OR REPLACE FUNCTION public.check_in_registration(p_registration_id UUID)
RETURNS VOID AS $$
DECLARE
  v_event_id UUID;
  v_is_allowed BOOLEAN;
BEGIN
  SELECT r.event_id INTO v_event_id
  FROM public.event_registrations r
  WHERE r.id = p_registration_id;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'registration not found';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.event_organizers eo
    WHERE eo.event_id = v_event_id AND eo.user_id = auth.uid()
  ) OR public.has_role(auth.uid(),'admin')
  INTO v_is_allowed;

  IF NOT v_is_allowed THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  UPDATE public.event_registrations
  SET status = 'checked_in',
      checked_in_at = COALESCE(checked_in_at, now()),
      checked_in_by = auth.uid(),
      updated_at = now()
  WHERE id = p_registration_id
    AND (status IS DISTINCT FROM 'checked_in');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


