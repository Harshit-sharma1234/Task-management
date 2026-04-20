-- ============================================================
-- FINAL FIX: INFINITE RECURSION & WORKSPACE ISOLATION
-- ============================================================
-- 1. Create SECURITY DEFINER functions to break recursion
-- These functions run with owner privileges, bypassing RLS.

CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id uuid)
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id 
    AND user_id = auth.uid()
  );
END; 
$$;

CREATE OR REPLACE FUNCTION public.shares_workspace_with(target_user_id uuid)
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.workspace_members current_wm
    JOIN public.workspace_members other_wm ON current_wm.workspace_id = other_wm.workspace_id
    WHERE current_wm.user_id = auth.uid()
    AND other_wm.user_id = target_user_id
  );
END; 
$$;

-- 2. Clean up ALL potentially recursive policies on workspace_members
DROP POLICY IF EXISTS "wm_select_workspace_member" ON public.workspace_members;
DROP POLICY IF EXISTS "wm_select_workspace_member_v2" ON public.workspace_members;
DROP POLICY IF EXISTS "wm_select_workspace_member_final" ON public.workspace_members;
DROP POLICY IF EXISTS "mbr_select_self" ON public.workspace_members;

-- 3. Create the NEW non-recursive policy for workspace_members
CREATE POLICY "wm_select_workspace_member_final" 
ON public.workspace_members
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.is_workspace_member(workspace_id)
);

-- 4. Clean up and update workspace policies
DROP POLICY IF EXISTS "ws_select_member_or_owner" ON public.workspaces;
DROP POLICY IF EXISTS "ws_select_member_or_owner_v2" ON public.workspaces;
DROP POLICY IF EXISTS "ws_select_member_or_owner_final" ON public.workspaces;

CREATE POLICY "ws_select_member_or_owner_final" 
ON public.workspaces
FOR SELECT 
TO authenticated
USING (
  public.is_workspace_member(id)
  OR created_by = auth.uid()
);

-- 5. Clean up and update users policies
DROP POLICY IF EXISTS "user_workspace_isolation" ON public.users;
DROP POLICY IF EXISTS "user_workspace_isolation_v2" ON public.users;
DROP POLICY IF EXISTS "user_workspace_isolation_final" ON public.users;
DROP POLICY IF EXISTS "Public user visibility" ON public.users;

CREATE POLICY "user_workspace_isolation_final" 
ON public.users
FOR SELECT 
TO authenticated
USING (
  id = auth.uid()
  OR public.shares_workspace_with(id)
);

-- 6. Hardened Tickets and Projects (Ensure they use the safe check)
DROP POLICY IF EXISTS "ws_tickets_isolation" ON public.tickets;
DROP POLICY IF EXISTS "ws_tickets_isolation_v2" ON public.tickets;
DROP POLICY IF EXISTS "ws_tickets_isolation_final" ON public.tickets;
CREATE POLICY "ws_tickets_isolation_final" 
ON public.tickets FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "ws_projects_isolation" ON public.projects;
DROP POLICY IF EXISTS "ws_projects_isolation_v2" ON public.projects;
DROP POLICY IF EXISTS "ws_projects_isolation_final" ON public.projects;
CREATE POLICY "ws_projects_isolation_final" 
ON public.projects FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id));

-- 7. Ensure Service Role bypass
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wm_service_role" ON public.workspace_members;
CREATE POLICY "wm_service_role" ON public.workspace_members
  FOR ALL TO service_role USING (true) WITH CHECK (true);
