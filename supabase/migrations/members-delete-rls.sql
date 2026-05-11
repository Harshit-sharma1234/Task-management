-- Enable RLS policy for deleting members
-- Restricted to Admin role only

DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

CREATE POLICY "Admins can delete users" 
ON public.users 
FOR DELETE 
TO authenticated 
USING (
    public.get_auth_role() = 'Admin'
);

-- Note: In Supabase, deleting from public.users doesn't delete from auth.users.
-- The server action handle deleting from Auth using the admin client.
