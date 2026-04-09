-- Enable RLS policy for deleting projects
-- Restricted to Admin and Project Manager roles

DROP POLICY IF EXISTS "Allow delete for Admins and Project Managers" ON public.projects;

CREATE POLICY "Allow delete for Admins and Project Managers" 
ON public.projects 
FOR DELETE 
TO authenticated 
USING (
    public.get_auth_role() IN ('Admin', 'Project Manager')
);

-- Ensure project members can be deleted by Admins and PMs as well
DROP POLICY IF EXISTS "Allow member deletion for Admins and Project Managers" ON public.project_members;
CREATE POLICY "Allow member deletion for Admins and Project Managers" 
ON public.project_members 
FOR DELETE 
TO authenticated 
USING (
    public.get_auth_role() IN ('Admin', 'Project Manager')
);
