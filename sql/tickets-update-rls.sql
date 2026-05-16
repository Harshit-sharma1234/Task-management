-- STEP 1: List and DROP any old permissive UPDATE policies on the tickets table.
-- Run this query first to see existing policies:
-- SELECT policyname FROM pg_policies WHERE tablename = 'tickets' AND cmd = 'UPDATE';
-- Then drop each one, e.g.:
-- DROP POLICY IF EXISTS "old_policy_name" ON public.tickets;

-- Common old policy names to clean up (drop ALL of these just in case):
DROP POLICY IF EXISTS "Update access for tickets" ON public.tickets;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.tickets;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.tickets;
DROP POLICY IF EXISTS "Tickets update policy" ON public.tickets;
DROP POLICY IF EXISTS "update_tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "authenticated_update" ON public.tickets;
DROP POLICY IF EXISTS "Allow update for all" ON public.tickets;

-- STEP 2: Helper Function to look up the role of any user by their public.users.id
CREATE OR REPLACE FUNCTION public.get_user_role_by_id(uid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_name text;
BEGIN
  SELECT r.role_name INTO v_role_name
  FROM public.users u
  JOIN public.roles r ON u.role_id = r.id
  WHERE u.auth_id = uid OR u.id = uid
  LIMIT 1;
  RETURN v_role_name;
END;
$$;

-- STEP 3: Create the STRICT UPDATE policy
-- ONLY Admin, PM, Assignee, or Reviewer can update a ticket. Nobody else.
CREATE POLICY "Update access for tickets"
ON public.tickets
FOR UPDATE
TO authenticated
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
  -- Assignee cannot change status to in_review or done (unless they are PM/Admin/Reviewer)
  (
    status NOT IN ('in_review', 'done')
    OR public.get_auth_role() IN ('Admin', 'Project Manager')
    OR reviewer_id = public.get_my_user_id()
  )
  AND
  -- Reviewer rules: Only Admin, PM, Sr Dev. Sr Devs cannot self-assign.
  (
    reviewer_id IS NULL
    OR
    (
      public.get_user_role_by_id(reviewer_id) IN ('Admin', 'Project Manager', 'Senior Developer')
      AND NOT (
        public.get_auth_role() = 'Senior Developer' AND reviewer_id = public.get_my_user_id()
      )
    )
  )
);

-- STEP 4: VERIFY there are no other UPDATE policies left!
-- Run this after executing the above:
-- SELECT policyname, permissive, cmd FROM pg_policies WHERE tablename = 'tickets';
-- You should see ONLY "Update access for tickets" for cmd = 'UPDATE'.
-- If you see ANY other UPDATE policy, drop it immediately!
