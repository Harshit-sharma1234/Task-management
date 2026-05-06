-- allow anyone to delete issues
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow delete for all authenticated users" ON public.tickets;
CREATE POLICY "Allow delete for all authenticated users" 
ON public.tickets 
FOR DELETE 
TO authenticated 
USING (true);

-- Also ensure comments and logs can be deleted if we want to clean those up, 
-- but tickets are the primary concern here. 
-- If there are foreign key constraints, we might need more policies or use CASCADE.
DROP POLICY IF EXISTS "Allow delete for comments" ON public.comments;
CREATE POLICY "Allow delete for comments" 
ON public.comments 
FOR DELETE 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow delete for logs" ON public.logs;
CREATE POLICY "Allow delete for logs" 
ON public.logs 
FOR DELETE 
TO authenticated 
USING (true);
