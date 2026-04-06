-- IMPORTANT: YOU MUST RUN THIS ENTIRE SCRIPT.
-- REASON FOR PREVIOUS FAILURE: 
-- We found that your Admin user ('harshit@example.com') has an `id` that does NOT match their Supabase `auth.uid()`. 
-- Instead, the true auth id is stored in `auth_id`. So the rule `user_id = auth.uid()` was instantly rejecting the admin, 
-- and the role checking function returned NULL!

-- 1. Ensure `.select()` works.
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read comments" ON public.comments;
CREATE POLICY "Public read comments" 
ON public.comments 
FOR SELECT TO authenticated USING (true);

-- 2. SECURE FUNCTION TO CORRECTLY FETCH THE PROFILE ID
-- Maps `auth.uid()` to your `public.users.id` by checking both `auth_id` and `id`
CREATE OR REPLACE FUNCTION public.get_my_user_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM public.users
  WHERE auth_id = auth.uid() OR id = auth.uid()
  LIMIT 1;
  
  RETURN v_user_id;
END;
$$;

-- 3. SECURE FUNCTION TO FETCH ROLE
CREATE OR REPLACE FUNCTION public.get_auth_role()
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
  WHERE u.auth_id = auth.uid() OR u.id = auth.uid()
  LIMIT 1;
  
  RETURN v_role_name;
END;
$$;

-- 4. THE RLS INSERT POLICY
DROP POLICY IF EXISTS "Comment access control" ON public.comments;
CREATE POLICY "Comment access control"
ON public.comments
FOR INSERT
TO authenticated
WITH CHECK (
  -- Ensure that the user_id being inserted belongs to the current user (mapped correctly)
  user_id = public.get_my_user_id()

  AND
  -- Only allow comments if the user is PM/Admin, OR if they are the Assignee/Reviewer of the ticket
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_id
    AND (
      public.get_auth_role() IN ('Admin', 'Project Manager')
      OR t.assignee_id = public.get_my_user_id()
      OR t.reviewer_id = public.get_my_user_id()
    )
  )
);
