-- ============================================================
-- EMERGENCY DATA CLEANUP: WORKSPACE LEAKAGE
-- 
-- Removes all members from NON-DEFAULT workspaces except for the creator.
-- This fixes the state where every user was added to "Acme Engineering".
-- ============================================================

DO $$
DECLARE
    ws_record RECORD;
BEGIN
    FOR ws_record IN 
        SELECT id, name, slug, created_by 
        FROM public.workspaces 
        WHERE slug != 'tectome' -- Never reset the default workspace
    LOOP
        RAISE NOTICE 'Cleaning up workspace: % (%)', ws_record.name, ws_record.slug;
        
        -- Delete all members except the creator
        DELETE FROM public.workspace_members
        WHERE workspace_id = ws_record.id
          AND user_id != ws_record.created_by;
          
        RAISE NOTICE 'Cleanup complete for %. Only the creator remains.', ws_record.name;
    END LOOP;
END $$;
