-- ============================================================
-- FIX: RLS RECURSION IN USERS TABLE (VERSION 2)
-- This script properly breaks the loop by using a 
-- SECURITY DEFINER function that bypasses RLS checks.
-- ============================================================

-- 1. Create a "Safe" Role Checker Function
-- SECURITY DEFINER means this runs as the database owner, bypassing RLS.
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

-- 2. CLEAN SLATE: Remove all existing policies on the users table
DROP POLICY IF EXISTS "Users can manage own profile" ON public.users;
DROP POLICY IF EXISTS "Admin/PM full access" ON public.users;
DROP POLICY IF EXISTS "Service role bypass" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Public profile visibility" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.users;

-- 3. ENABLE RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. IMPLEMENT NON-RECURSIVE POLICIES

-- Policy: Users can see and update their own data
CREATE POLICY "Users can manage own profile"
ON public.users
FOR ALL
TO authenticated
USING (auth.uid() = id OR auth.uid() = auth_id)
WITH CHECK (auth.uid() = id OR auth.uid() = auth_id);

-- Policy: Admin/PM visibility
-- This calls our SAFE function which bypasses the RLS recursion limit.
CREATE POLICY "Admin/PM high-level access"
ON public.users
FOR ALL 
TO authenticated
USING (public.check_is_admin_or_pm());

-- 4. EMERGENCY BYPASS
CREATE POLICY "Service role bypass v2"
ON public.users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================
-- NOTE: Run this script in your Supabase SQL Editor.
-- It will fix the "Infinite Recursion" error immediately.
-- ============================================================
