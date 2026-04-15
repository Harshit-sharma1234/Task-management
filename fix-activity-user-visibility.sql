-- ============================================================
-- FIX: COMMENTER VISIBILITY FOR ALL ROLES
-- 
-- This policy allows all authenticated users to view the basic 
-- profile information (id, name, email, avatar_url) of other users.
-- This is essential for the activity feed and comments to display 
-- the identity of commenters to everyone, regardless of their role.
-- ============================================================

-- Drop if exists to avoid conflicts
DROP POLICY IF EXISTS "users_read_all_authenticated" ON public.users;

-- Create the new policy
CREATE POLICY "users_read_all_authenticated"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Verify policies on users table
SELECT policyname, cmd, roles, qual
FROM pg_policies
WHERE tablename = 'users' AND schemaname = 'public';
