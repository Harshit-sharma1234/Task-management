-- ============================================================
-- SOCIAL AUTH USER SYNCHRONIZATION
-- 
-- Automatically creates a public.users profile when a user signs in 
-- via Google, Microsoft, or any other auth provider.
-- ============================================================

-- 1. Create the sync function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, auth_id, email, name, avatar_url, employee_id)
  VALUES (
    new.id,
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'),
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'employee_id', 'EXT-' || upper(substring(new.id::text from 1 for 8))) -- Fallback for OAuth users
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    avatar_url = EXCLUDED.avatar_url,
    email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Sync existing users (safety check)
INSERT INTO public.users (id, auth_id, email, name, avatar_url, employee_id)
SELECT 
    id, 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', 'User'),
    raw_user_meta_data->>'avatar_url',
    COALESCE(raw_user_meta_data->>'employee_id', 'EXT-' || upper(substring(id::text from 1 for 8)))
FROM auth.users
ON CONFLICT (id) DO NOTHING;
