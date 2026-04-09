-- tickets_rls.sql
-- Enforce Row Level Security (RLS) on the `tickets` table
-- Updated for universal visibility for all authenticated users.

-- 1. Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies
DROP POLICY IF EXISTS "Unified ticket view access" ON public.tickets;
DROP POLICY IF EXISTS "Enhanced ticket update access" ON public.tickets;
DROP POLICY IF EXISTS "Unified ticket insert access" ON public.tickets;
DROP POLICY IF EXISTS "Users can view tickets for their projects" ON public.tickets;

-- 3. SELECT: All authenticated users can view all tickets
CREATE POLICY "Unified ticket view access"
ON public.tickets FOR SELECT TO authenticated
USING (true);

-- 4. UPDATE: Restricted to Admin, PM, Assignee, Reviewer
CREATE POLICY "Enhanced ticket update access"
ON public.tickets FOR UPDATE TO authenticated
USING (
    public.get_auth_role() IN ('Admin', 'Project Manager')
    OR assignee_id = public.get_my_user_id()
    OR reviewer_id = public.get_my_user_id()
)
WITH CHECK (
    -- Authorization
    (
        public.get_auth_role() IN ('Admin', 'Project Manager')
        OR assignee_id = public.get_my_user_id()
        OR reviewer_id = public.get_my_user_id()
    )
    AND
    -- Status Restriction
    (
        status NOT IN ('in_review', 'done')
        OR public.get_auth_role() IN ('Admin', 'Project Manager')
        OR reviewer_id = public.get_my_user_id()
    )
    AND
    -- Reviewer Eligibility
    (
        reviewer_id IS NULL
        OR (
            public.get_user_role_by_id(reviewer_id) IN ('Admin', 'Project Manager', 'Senior Developer')
            AND
            NOT (
                public.get_auth_role() = 'Senior Developer' 
                AND reviewer_id = public.get_my_user_id()
            )
        )
    )
);

-- 5. INSERT: Admin, PM, and Project Members
CREATE POLICY "Unified ticket insert access"
ON public.tickets FOR INSERT TO authenticated
WITH CHECK (
    public.get_auth_role() IN ('Admin', 'Project Manager')
    OR EXISTS (
        SELECT 1 FROM public.project_members pm 
        WHERE pm.project_id = project_id 
        AND pm.user_id = public.get_my_user_id()
    )
);
