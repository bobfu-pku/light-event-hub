-- Helper RPC: find user_id by registered email (auth.users)
-- SECURITY DEFINER so that client can resolve user_id from email without direct access to auth schema

CREATE OR REPLACE FUNCTION public.find_user_id_by_email(p_email TEXT)
RETURNS UUID AS $$
  SELECT u.id
  FROM auth.users u
  WHERE lower(u.email) = lower(p_email)
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Optional: allow execution for authenticated users
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(TEXT) TO anon, authenticated;


