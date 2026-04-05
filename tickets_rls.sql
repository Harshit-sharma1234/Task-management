-- tickets_rls.sql
-- Enforce Row Level Security (RLS) on the `tickets` table

-- 1. Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist (to allow safe re-runs)
DROP POLICY IF EXISTS "Users can view tickets for their projects" ON public.tickets;
DROP POLICY IF EXISTS "Users can create tickets for their projects" ON public.tickets;
DROP POLICY IF EXISTS "Users can update tickets for their projects" ON public.tickets;
DROP POLICY IF EXISTS "Users can delete tickets for their projects" ON public.tickets;

-- 3. SELECT Policy: A user can view a ticket if they are a member of the project
CREATE POLICY "Users can view tickets for their projects"
ON public.tickets FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.project_members pm 
        WHERE pm.project_id = tickets.project_id 
        AND pm.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = tickets.project_id
        AND p.lead_id = auth.uid()
    )
);

-- 4. INSERT Policy: A user can create a ticket if they are a member of the project
CREATE POLICY "Users can create tickets for their projects"
ON public.tickets FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.project_members pm 
        WHERE pm.project_id = project_id 
        AND pm.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_id
        AND p.lead_id = auth.uid()
    )
);

-- 5. UPDATE Policy: A user can update a ticket if they are a member of the project OR the assignee
CREATE POLICY "Users can update tickets for their projects"
ON public.tickets FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.project_members pm 
        WHERE pm.project_id = tickets.project_id 
        AND pm.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = tickets.project_id
        AND p.lead_id = auth.uid()
    )
);

-- 6. DELETE Policy: Optional - Only Project Leads or Ticket Creators can delete
CREATE POLICY "Users can delete tickets for their projects"
ON public.tickets FOR DELETE
USING (
    created_by = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = tickets.project_id
        AND p.lead_id = auth.uid()
    )
);
