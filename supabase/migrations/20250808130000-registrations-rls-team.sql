-- Allow event team members (leader or member) to view and manage registrations

-- Helper: user_is_event_team_member (SECURITY DEFINER)
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

-- SELECT registrations: organizers and team members
DROP POLICY IF EXISTS "Team can view registrations" ON public.event_registrations;
CREATE POLICY "Team can view registrations" ON public.event_registrations
FOR SELECT USING (
  public.user_is_event_team_member(event_id, auth.uid()) OR public.has_role(auth.uid(), 'admin')
);

-- UPDATE registrations: allow team to update (e.g., approve/check-in)
DROP POLICY IF EXISTS "Team can update registrations" ON public.event_registrations;
CREATE POLICY "Team can update registrations" ON public.event_registrations
FOR UPDATE USING (
  public.user_is_event_team_member(event_id, auth.uid()) OR public.has_role(auth.uid(), 'admin')
);


