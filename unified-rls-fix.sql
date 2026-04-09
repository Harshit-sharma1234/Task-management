-- UNIVERSAL VISIBILITY & ENHANCED SECURITY RLS FIX
-- Target: Tickets, Projects, and Comments
-- Fixes the 404 "Lost in space" error by allowing all logged-in users to view any issue.

-- 1. FUNCTIONS
CREATE OR REPLACE FUNCTION public.get_my_user_id()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM public.users
  WHERE auth_id = auth.uid() OR id = auth.uid() LIMIT 1;
  RETURN v_user_id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role_name text;
BEGIN
  SELECT r.role_name INTO v_role_name FROM public.users u
  JOIN public.roles r ON u.role_id = r.id
  WHERE u.auth_id = auth.uid() OR u.id = auth.uid() LIMIT 1;
  RETURN v_role_name;
END; $$;

CREATE OR REPLACE FUNCTION public.get_user_role_by_id(uid uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role_name text;
BEGIN
  SELECT r.role_name INTO v_role_name FROM public.users u
  JOIN public.roles r ON u.role_id = r.id
  WHERE u.auth_id = uid OR u.id = uid LIMIT 1;
  RETURN v_role_name;
END; $$;

-- 2. PROJECTS POLICIES (Ensure visibility to avoid UI break)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public project access" ON public.projects;
CREATE POLICY "Public project access"
ON public.projects FOR SELECT TO authenticated
USING (true);

-- 3. TICKETS POLICIES
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Unified ticket view access" ON public.tickets;
DROP POLICY IF EXISTS "Enhanced ticket update access" ON public.tickets;
DROP POLICY IF EXISTS "Unified ticket insert access" ON public.tickets;

-- SELECT: Universal visibility as requested
CREATE POLICY "Unified ticket view access"
ON public.tickets FOR SELECT TO authenticated
USING (true);

-- UPDATE: Restricted to Admin, PM, Assignee, Reviewer
CREATE POLICY "Enhanced ticket update access"
ON public.tickets FOR UPDATE TO authenticated
USING (
    public.get_auth_role() IN ('Admin', 'Project Manager')
    OR assignee_id = public.get_my_user_id()
    OR reviewer_id = public.get_my_user_id()
)
WITH CHECK (
    (
        public.get_auth_role() IN ('Admin', 'Project Manager')
        OR assignee_id = public.get_my_user_id()
        OR reviewer_id = public.get_my_user_id()
    )
    AND
    (
        status NOT IN ('in_review', 'done')
        OR public.get_auth_role() IN ('Admin', 'Project Manager')
        OR reviewer_id = public.get_my_user_id()
    )
    AND
    (
        reviewer_id IS NULL
        OR (
            public.get_user_role_by_id(reviewer_id) IN ('Admin', 'Project Manager', 'Senior Developer')
            AND NOT (
                public.get_auth_role() = 'Senior Developer' 
                AND reviewer_id = public.get_my_user_id()
            )
        )
    )
);

-- INSERT: Admin, PM, and Project Members (and Lead)
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

-- 4. COMMENTS POLICIES
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.comments 
ALTER COLUMN user_id SET DEFAULT public.get_my_user_id();

DROP POLICY IF EXISTS "Comment select access" ON public.comments;
DROP POLICY IF EXISTS "Enhanced comment insert access" ON public.comments;

-- SELECT
CREATE POLICY "Comment select access"
ON public.comments FOR SELECT TO authenticated
USING (true); -- Since tickets are universal, comments also are

-- INSERT: Restricted as before
CREATE POLICY "Enhanced comment insert access"
ON public.comments FOR INSERT TO authenticated
WITH CHECK (
    user_id = public.get_my_user_id()
    AND EXISTS (
        SELECT 1 FROM public.tickets t
        WHERE t.id = ticket_id
        AND (
            public.get_auth_role() IN ('Admin', 'Project Manager')
            OR t.assignee_id = public.get_my_user_id()
            OR t.reviewer_id = public.get_my_user_id()
        )
    )
);
