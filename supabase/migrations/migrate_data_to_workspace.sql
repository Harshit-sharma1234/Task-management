-- ============================================================
-- PROJECT & TICKET WORKSPACE MIGRATION
-- 
-- Assigns orphaned projects and tickets (those with NULL workspace_id)
-- to the default 'Tectome' workspace.
-- ============================================================

DO $$
DECLARE
    default_workspace_id uuid;
BEGIN
    -- 1. Get the default workspace ID
    SELECT id INTO default_workspace_id FROM public.workspaces WHERE slug = 'tectome' LIMIT 1;

    IF default_workspace_id IS NULL THEN
        RAISE EXCEPTION 'Default workspace "tectome" not found. Please run workspace_migration.sql first.';
    END IF;

    -- 2. Migrate orphaned projects
    UPDATE public.projects
    SET workspace_id = default_workspace_id
    WHERE workspace_id IS NULL;

    -- 3. Migrate orphaned tickets
    UPDATE public.tickets
    SET workspace_id = default_workspace_id
    WHERE workspace_id IS NULL;

    RAISE NOTICE 'Project and ticket migration complete.';
END $$;
