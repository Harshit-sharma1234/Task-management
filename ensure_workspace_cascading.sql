-- ============================================================
-- ENSURE WORKSPACE CASCADING DELETES
-- 
-- Standardizes foreign key constraints on tables referencing workspaces
-- to ensure that deleting a workspace removes all associated data.
-- ============================================================

-- 1. Projects
ALTER TABLE public.projects 
  DROP CONSTRAINT IF EXISTS projects_workspace_id_fkey,
  ADD CONSTRAINT projects_workspace_id_fkey 
    FOREIGN KEY (workspace_id) 
    REFERENCES public.workspaces(id) 
    ON DELETE CASCADE;

-- 2. Tickets (Issues)
ALTER TABLE public.tickets 
  DROP CONSTRAINT IF EXISTS tickets_workspace_id_fkey,
  ADD CONSTRAINT tickets_workspace_id_fkey 
    FOREIGN KEY (workspace_id) 
    REFERENCES public.workspaces(id) 
    ON DELETE CASCADE;

-- 3. Workspace Members
ALTER TABLE public.workspace_members 
  DROP CONSTRAINT IF EXISTS workspace_members_workspace_id_fkey,
  ADD CONSTRAINT workspace_members_workspace_id_fkey 
    FOREIGN KEY (workspace_id) 
    REFERENCES public.workspaces(id) 
    ON DELETE CASCADE;

-- 4. Workspace Invites
ALTER TABLE public.workspace_invites 
  DROP CONSTRAINT IF EXISTS workspace_invites_workspace_id_fkey,
  ADD CONSTRAINT workspace_invites_workspace_id_fkey 
    FOREIGN KEY (workspace_id) 
    REFERENCES public.workspaces(id) 
    ON DELETE CASCADE;

-- Note: notifications.workspace_id and users.last_workspace_id 
-- are already handled in workspace_migration.sql and workspace_isolation_final.sql.
