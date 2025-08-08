-- Ensure admin_get_all_points_totals includes all users and is admin-restricted
-- Safe to re-run: CREATE OR REPLACE

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
  WHERE public.has_role(auth.uid(),'admin')
  GROUP BY p.user_id
  ORDER BY total_points DESC, participation_points DESC;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, auth;

-- Allow function execution from client; non-admins will receive 0 rows due to WHERE clause
GRANT EXECUTE ON FUNCTION public.admin_get_all_points_totals() TO anon, authenticated;


