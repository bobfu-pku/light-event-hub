-- Harden find_user_id_by_email: return NULL when not found; ensure search_path
CREATE OR REPLACE FUNCTION public.find_user_id_by_email(p_email TEXT)
RETURNS UUID AS $$
  SELECT u.id
  FROM auth.users u
  WHERE lower(u.email) = lower(p_email)
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, auth;


