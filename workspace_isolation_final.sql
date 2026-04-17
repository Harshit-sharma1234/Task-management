-- ============================================================
-- FINAL WORKSPACE ISOLATION & SECURITY HARDENING (v3 - TRIGGER AUDIT)
-- ============================================================

-- A. DROP POTENTIAL LEGACY TRIGGERS (Source of Member Leakage)
-- We need to ensure no hidden automation is populating new workspaces with all users.
DO $$
DECLARE
    trig_name text;
    tbl_name text;
BEGIN
    FOR trig_name, tbl_name IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_name LIKE '%add_all_users%' 
           OR trigger_name LIKE '%auto_member%'
           OR trigger_name LIKE '%sync_members%'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(trig_name) || ' ON ' || quote_ident(tbl_name);
        RAISE NOTICE 'Dropped suspicious trigger: % on %', trig_name, tbl_name;
    END LOOP;
END $$;

-- 1. NOTIFICATIONS TABLE UPDATES
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Backfill workspace_id from linked entities (best effort)
UPDATE public.notifications n
SET workspace_id = t.workspace_id
FROM public.tickets t
WHERE n.entity_type IN ('ticket', 'issue', 'assignment', 'status_change', 'comment')
  AND n.entity_id = t.id
  AND n.workspace_id IS NULL;

UPDATE public.notifications n
SET workspace_id = p.workspace_id
FROM public.projects p
WHERE n.entity_type IN ('project', 'member_add')
  AND n.entity_id = p.id
  AND n.workspace_id IS NULL;

-- 2. RLS HARDENING: PROJECTS
DROP POLICY IF EXISTS "Public project access" ON public.projects;
DROP POLICY IF EXISTS "ws_projects_isolation" ON public.projects;
CREATE POLICY "ws_projects_isolation" ON public.projects
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm 
      WHERE wm.user_id = auth.uid()
    )
  );

-- 3. RLS HARDENING: TICKETS (ISSUES)
DROP POLICY IF EXISTS "Unified ticket view access" ON public.tickets;
DROP POLICY IF EXISTS "ws_tickets_isolation" ON public.tickets;
CREATE POLICY "ws_tickets_isolation" ON public.tickets
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM public.workspace_members wm 
      WHERE wm.user_id = auth.uid()
    )
  );

-- 4. RLS HARDENING: NOTIFICATIONS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif_select_isolation" ON public.notifications;
CREATE POLICY "notif_select_isolation" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    AND (
      workspace_id IS NULL -- Allow seeing old notifications (best effort)
      OR workspace_id IN (
        SELECT wm.workspace_id FROM public.workspace_members wm 
        WHERE wm.user_id = auth.uid()
      )
    )
  );

-- 5. RLS HARDENING: USERS (Privacy & Team Isolation)
-- FIX: Removed recursive subquery on users table.
DROP POLICY IF EXISTS "Public user visibility" ON public.users;
DROP POLICY IF EXISTS "user_workspace_isolation" ON public.users;
CREATE POLICY "user_workspace_isolation" ON public.users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid() -- Can always see self
    OR id IN (
      -- Check if the target user (id) shares a workspace with the current user (auth.uid())
      -- We query ONLY workspace_members to avoid infinite recursion.
      SELECT wm2.user_id 
      FROM public.workspace_members wm1
      JOIN public.workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = auth.uid()
    )
  );

-- 6. Ensure Service Role can always do everything
DROP POLICY IF EXISTS "notif_service_role" ON public.notifications;
CREATE POLICY "notif_service_role" ON public.notifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "wm_service_role" ON public.workspace_members;
CREATE POLICY "wm_service_role" ON public.workspace_members
  FOR ALL TO service_role USING (true) WITH CHECK (true);
