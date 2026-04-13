-- ============================================================
-- DEFINITIVE FIX: RLS INFINITE RECURSION ON "users" TABLE
-- 
-- This script:
--   1. Drops ALL existing policies on public.users (nuclear cleanup)
--   2. Creates/updates SECURITY DEFINER helper functions
--   3. Recreates safe, non-recursive policies
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- =========================
-- STEP 1: DROP ALL POLICIES
-- =========================
-- This dynamically finds and drops every policy, regardless of name.
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- ================================
-- STEP 2: SECURITY DEFINER HELPERS
-- ================================
-- These run as the DB owner, bypassing RLS entirely.

CREATE OR REPLACE FUNCTION public.check_is_admin_or_pm()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE (u.id = auth.uid() OR u.auth_id = auth.uid())
    AND r.role_name IN ('Admin', 'Project Manager')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_user_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM public.users
  WHERE auth_id = auth.uid() OR id = auth.uid() LIMIT 1;
  RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_role_name text;
BEGIN
  SELECT r.role_name INTO v_role_name FROM public.users u
  JOIN public.roles r ON u.role_id = r.id
  WHERE u.auth_id = auth.uid() OR u.id = auth.uid() LIMIT 1;
  RETURN v_role_name;
END;
$$;

-- ================================
-- STEP 3: ENSURE RLS IS ENABLED
-- ================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ================================
-- STEP 4: CREATE SAFE POLICIES
-- ================================

-- 4a. Users can read/update their own row (no self-join = no recursion)
CREATE POLICY "users_own_profile"
ON public.users
FOR ALL
TO authenticated
USING (auth.uid() = id OR auth.uid() = auth_id)
WITH CHECK (auth.uid() = id OR auth.uid() = auth_id);

-- 4b. Admin/PM can read all rows (via SECURITY DEFINER = no recursion)
CREATE POLICY "users_admin_pm_access"
ON public.users
FOR ALL
TO authenticated
USING (public.check_is_admin_or_pm());

-- 4c. Service role bypasses everything (for admin client / server actions)
CREATE POLICY "users_service_role_bypass"
ON public.users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4d. Admins can delete users (via SECURITY DEFINER = no recursion)
CREATE POLICY "users_admin_delete"
ON public.users
FOR DELETE
TO authenticated
USING (public.get_auth_role() = 'Admin');

-- ============================================================
-- VERIFICATION: List all policies on users table after fix
-- ============================================================
SELECT policyname, cmd, roles, qual
FROM pg_policies
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY policyname;
