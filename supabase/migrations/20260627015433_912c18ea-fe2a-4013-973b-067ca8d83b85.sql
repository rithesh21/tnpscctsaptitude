
CREATE OR REPLACE FUNCTION public.grant_admin_by_email(_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_email text;
  target_id uuid;
BEGIN
  SELECT lower(email) INTO caller_email FROM auth.users WHERE id = auth.uid();
  IF caller_email IS NULL OR caller_email <> 'ritheshmarshal21@gmail.com' THEN
    RAISE EXCEPTION 'Forbidden: only the owner can grant admin';
  END IF;

  SELECT id INTO target_id FROM auth.users WHERE lower(email) = lower(_email);
  IF target_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'User has not signed up yet');
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (target_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN jsonb_build_object('ok', true, 'user_id', target_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_admin_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_admin_by_email(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_admin_by_email(_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_email text;
  target_id uuid;
BEGIN
  SELECT lower(email) INTO caller_email FROM auth.users WHERE id = auth.uid();
  IF caller_email IS NULL OR caller_email <> 'ritheshmarshal21@gmail.com' THEN
    RAISE EXCEPTION 'Forbidden: only the owner can revoke admin';
  END IF;
  IF lower(_email) = 'ritheshmarshal21@gmail.com' THEN
    RAISE EXCEPTION 'Cannot revoke owner';
  END IF;
  SELECT id INTO target_id FROM auth.users WHERE lower(email) = lower(_email);
  IF target_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'User not found');
  END IF;
  DELETE FROM public.user_roles WHERE user_id = target_id AND role = 'admin';
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.revoke_admin_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_admin_by_email(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_admin_emails()
RETURNS TABLE(email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_email text;
BEGIN
  SELECT lower(u.email) INTO caller_email FROM auth.users u WHERE u.id = auth.uid();
  IF caller_email IS NULL OR caller_email <> 'ritheshmarshal21@gmail.com' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
    SELECT u.email::text FROM auth.users u
    JOIN public.user_roles r ON r.user_id = u.id
    WHERE r.role = 'admin'
    ORDER BY u.email;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.list_admin_emails() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_admin_emails() TO authenticated;
