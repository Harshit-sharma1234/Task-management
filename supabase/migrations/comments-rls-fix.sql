-- comments-rls-fix.sql
-- Enforce Row Level Security (RLS) on the `comments` table
-- Uses database default for user_id to fix ID mapping issues.

-- 1. Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 2. Set default user_id automatically
ALTER TABLE public.comments 
ALTER COLUMN user_id SET DEFAULT public.get_my_user_id();

-- 3. Drop existing policies
DROP POLICY IF EXISTS "Comment select access" ON public.comments;
DROP POLICY IF EXISTS "Enhanced comment insert access" ON public.comments;
DROP POLICY IF EXISTS "Comment insert access" ON public.comments;
DROP POLICY IF EXISTS "Public read comments" ON public.comments;

-- 4. SELECT: Based on ticket visibility
CREATE POLICY "Comment select access"
ON public.comments FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.tickets t
        WHERE t.id = comments.ticket_id
    )
);

-- 5. INSERT: Restricted and ID mapping safe
CREATE POLICY "Enhanced comment insert access"
ON public.comments FOR INSERT TO authenticated
WITH CHECK (
    user_id = public.get_my_user_id()
    AND EXISTS (
        SELECT 1 FROM public.tickets t
        WHERE t.id = comments.ticket_id
        AND (
            public.get_auth_role() IN ('Admin', 'Project Manager')
            OR t.assignee_id = public.get_my_user_id()
            OR t.reviewer_id = public.get_my_user_id()
        )
    )
);
