-- ============================================================
-- ONBOARDING SCHEMA MIGRATION
-- Adds self-signup onboarding support to the existing schema
-- Safe to run: uses IF NOT EXISTS / IF EXISTS throughout
-- ============================================================

-- 1. Add onboarding_status to existing users table
--    Default 'approved' so existing users are unaffected
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS onboarding_status text 
DEFAULT 'approved' 
CHECK (onboarding_status IN ('pending', 'approved', 'rejected'));

-- 2. Onboarding requests table (audit trail + approval metadata)
CREATE TABLE IF NOT EXISTS public.onboarding_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    requested_at timestamptz NOT NULL DEFAULT now(),
    reviewed_by uuid REFERENCES public.users(id),
    reviewed_at timestamptz,
    assigned_role_id uuid REFERENCES public.roles(id),
    status text NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason text,
    notification_sent_at timestamptz,
    approval_email_sent_at timestamptz,
    
    CONSTRAINT unique_user_request UNIQUE (user_id)
);

-- 3. Index for fast pending lookups (used by approval dashboard + sidebar badge)
CREATE INDEX IF NOT EXISTS idx_onboarding_pending 
ON public.onboarding_requests(status) WHERE status = 'pending';

-- 4. RLS for onboarding_requests
ALTER TABLE public.onboarding_requests ENABLE ROW LEVEL SECURITY;

-- Only Admin/PM can read onboarding requests
DROP POLICY IF EXISTS "Admin/PM read onboarding requests" ON public.onboarding_requests;
CREATE POLICY "Admin/PM read onboarding requests"
ON public.onboarding_requests FOR SELECT TO authenticated
USING (public.get_auth_role() IN ('Admin', 'Project Manager'));

-- Only Admin/PM can update (approve/reject)
DROP POLICY IF EXISTS "Admin/PM update onboarding requests" ON public.onboarding_requests;
CREATE POLICY "Admin/PM update onboarding requests"
ON public.onboarding_requests FOR UPDATE TO authenticated
USING (public.get_auth_role() IN ('Admin', 'Project Manager'))
WITH CHECK (public.get_auth_role() IN ('Admin', 'Project Manager'));

-- Insert allowed for service role (signup creates via admin client)
DROP POLICY IF EXISTS "Service insert onboarding requests" ON public.onboarding_requests;
CREATE POLICY "Service insert onboarding requests"
ON public.onboarding_requests FOR INSERT TO authenticated
WITH CHECK (true);

-- 5. Add unique constraint on employee_id (prevent duplicate signups)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_employee_id_unique'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_employee_id_unique UNIQUE (employee_id);
  END IF;
END $$;

-- ============================================================
-- VERIFICATION: Run after migration to confirm
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' AND column_name = 'onboarding_status';
--
-- SELECT * FROM information_schema.tables 
-- WHERE table_name = 'onboarding_requests';
-- ============================================================
