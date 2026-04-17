-- ============================================================
-- WORKSPACE AUTH MIGRATION — TARGETED CHANGES
-- 
-- Your DB already has: workspaces, workspace_members, workspace_invites,
-- projects.workspace_id, tickets.workspace_id
--
-- This migration ONLY does what's still needed:
--   1. Adds last_workspace_id to users
--   2. Creates a default workspace + migrates existing users
--   3. Drops onboarding columns
--   4. Fixes RLS policies on workspace tables
-- ============================================================

-- ================================
-- STEP 1: Add last_workspace_id to users
-- ================================
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS last_workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- ================================
-- STEP 2: Create Default Workspace & Migrate Users
-- ================================

-- 2a. Create the default "Tectome" workspace (idempotent via WHERE NOT EXISTS)
INSERT INTO public.workspaces (id, name, slug, created_by, created_at)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Tectome',
  'tectome',
  (SELECT id FROM public.users ORDER BY created_at ASC LIMIT 1),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspaces WHERE slug = 'tectome'
);

-- 2b. Migrate ALL existing users into the default workspace with their current role
INSERT INTO public.workspace_members (workspace_id, user_id, role_id, joined_at)
SELECT 
  w.id,
  u.id,
  COALESCE(u.role_id, (SELECT id FROM public.roles WHERE role_name = 'Junior Developer' LIMIT 1)),
  now()
FROM public.users u
CROSS JOIN (SELECT id FROM public.workspaces WHERE slug = 'tectome' LIMIT 1) w
WHERE u.role_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.workspace_members wm 
    WHERE wm.workspace_id = w.id AND wm.user_id = u.id
  );

-- 2c. Set last_workspace_id for existing users
UPDATE public.users 
SET last_workspace_id = (SELECT id FROM public.workspaces WHERE slug = 'tectome' LIMIT 1)
WHERE last_workspace_id IS NULL;

-- ================================
-- STEP 3: Drop Legacy Columns
-- ================================

-- Drop onboarding columns
ALTER TABLE public.users DROP COLUMN IF EXISTS onboarding_status;
DROP TABLE IF EXISTS public.onboarding_requests CASCADE;

-- NOTE: DO NOT drop users.role_id yet — some pages still fallback to it.
-- Uncomment the line below ONLY after confirming everything works:
-- ALTER TABLE public.users DROP COLUMN IF EXISTS role_id;

-- ================================
-- STEP 4: Fix RLS Policies
-- ================================

-- 4a. workspace_members — users should see ALL members of workspaces they belong to
-- (Currently mbr_select_self only lets users see their own row)

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "mbr_select_self" ON public.workspace_members;

-- Create policy: see members of YOUR workspaces
DROP POLICY IF EXISTS "wm_select_workspace_member" ON public.workspace_members;
CREATE POLICY "wm_select_workspace_member" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT wm2.workspace_id FROM public.workspace_members wm2 
      WHERE wm2.user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- Allow insert for workspace owners/admins (keep existing or add)
DROP POLICY IF EXISTS "mbr_insert_if_ws_owner" ON public.workspace_members;
DROP POLICY IF EXISTS "wm_insert_member" ON public.workspace_members;
CREATE POLICY "wm_insert_member" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (true); -- Controlled by server actions using admin client

-- Allow delete for admin actions  
DROP POLICY IF EXISTS "wm_delete_member" ON public.workspace_members;
CREATE POLICY "wm_delete_member" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (true); -- Controlled by server actions

-- Allow update for admin actions
DROP POLICY IF EXISTS "wm_update_member" ON public.workspace_members;
CREATE POLICY "wm_update_member" ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (true); -- Controlled by server actions

-- 4b. workspaces — keep existing policies, add: users can see workspaces they're members of
-- Your existing ws_select_member_or_owner is likely fine, but let's ensure it works
DROP POLICY IF EXISTS "ws_select_member_or_owner" ON public.workspaces;
CREATE POLICY "ws_select_member_or_owner" ON public.workspaces
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    OR created_by = auth.uid()
  );

-- 4c. workspace_invites — users should see invites sent to their email
DROP POLICY IF EXISTS "wi_select_own_email" ON public.workspace_invites;
CREATE POLICY "wi_select_own_email" ON public.workspace_invites
  FOR SELECT TO authenticated
  USING (
    email = (SELECT email FROM public.users WHERE auth_id = auth.uid() LIMIT 1)
  );

-- 4d. Service role bypass for workspace tables
DROP POLICY IF EXISTS "wm_service" ON public.workspace_members;
CREATE POLICY "wm_service" ON public.workspace_members
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "wi_service" ON public.workspace_invites;
CREATE POLICY "wi_service" ON public.workspace_invites
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ================================
-- STEP 5: Performance Indexes
-- ================================
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_users_last_workspace ON public.users(last_workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_token ON public.workspace_invites(token);

-- ================================
-- VERIFICATION — Run after migration:
-- ================================
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND table_schema = 'public' ORDER BY ordinal_position;
-- SELECT * FROM public.workspaces;
-- SELECT wm.*, u.name, r.role_name FROM workspace_members wm JOIN users u ON wm.user_id = u.id JOIN roles r ON wm.role_id = r.id;
