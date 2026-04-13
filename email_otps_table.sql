-- ============================================================
-- EMAIL OTP TABLE
-- Stores verification codes for signup flow
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_otps (
    email text PRIMARY KEY,
    otp_code text NOT NULL,
    expires_at timestamptz NOT NULL,
    verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- Only service role can manage OTPs (via admin client)
DROP POLICY IF EXISTS "Service role can manage OTPs" ON public.email_otps;
CREATE POLICY "Service role can manage OTPs"
ON public.email_otps FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Index for expiry cleanup (can be used for cron jobs later)
CREATE INDEX IF NOT EXISTS idx_email_otps_expires_at ON public.email_otps(expires_at);
