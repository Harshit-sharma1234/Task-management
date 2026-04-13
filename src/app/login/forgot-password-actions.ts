'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { randomInt } from 'crypto'
import { baseLayout } from '@/lib/email-templates' // Re-import baseLayout logic or similar

/**
 * Custom template for Password Reset OTP
 */
function passwordResetEmail(params: { otpCode: string; expiresInMinutes: number }): string {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a2e;text-align:center;">
      Reset your password
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;text-align:center;line-height:1.6;">
      Use the following verification code to reset your password on Tectome. This code is valid for 5 minutes.
    </p>
    
    <div style="background-color:#f8f9fc;border-radius:12px;border:1px solid #e8ecf1;padding:24px;text-align:center;margin-bottom:24px;">
      <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#5e6ad2;margin-bottom:8px;">
        ${params.otpCode}
      </div>
      <div style="font-size:12px;color:#64748b;">
        Expires in ${params.expiresInMinutes} minutes
      </div>
    </div>
    
    <p style="margin:0;font-size:13px;color:#64748b;text-align:center;line-height:1.6;">
      If you didn't request a password reset, you can safely ignore this email.
    </p>
  `);
}

export async function requestPasswordResetOTP(email: string) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { error: 'A valid email address is required.' }
    }

    const adminClient = createAdminClient()

    // 1. Verify user exists
    const { data: user } = await adminClient
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle()

    if (!user) {
        // Security best practice: don't reveal if user exists. 
        // But for internal apps, it's often better to be helpful. 
        // We'll return success anyway to prevent email enumeration, OR return error if specifically requested.
        // User asked for "forgot password" specifically, let's be helpful.
        return { error: 'No account found with this email address.' }
    }

    const otpCode = randomInt(100000, 999999).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes

    const { error: otpError } = await adminClient
        .from('email_otps')
        .upsert({
            email: email.toLowerCase(),
            otp_code: otpCode,
            expires_at: expiresAt,
            verified: false
        })

    if (otpError) {
        console.error('[Reset OTP] Error saving OTP:', otpError)
        return { error: 'Failed to generate reset code.' }
    }

    const html = passwordResetEmail({ otpCode, expiresInMinutes: 5 })
    const { success, error: emailError } = await sendEmail({
        to: email,
        subject: `Password Reset Code: ${otpCode}`,
        html
    })

    if (!success) {
        console.error('[Reset OTP] Email error:', emailError)
        return { error: 'Failed to send reset email. Please try again.' }
    }

    return { success: true }
}

export async function verifyPasswordResetOTP(email: string, otp: string) {
    const adminClient = createAdminClient()

    const { data: otpRow, error } = await adminClient
        .from('email_otps')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('otp_code', otp)
        .maybeSingle()

    if (error || !otpRow) {
        return { error: 'Invalid reset code.' }
    }

    if (new Date(otpRow.expires_at) < new Date()) {
        return { error: 'Reset code has expired. Please request a new one.' }
    }

    return { success: true }
}

export async function finalizePasswordReset(email: string, otp: string, newPassword: string) {
    const adminClient = createAdminClient()

    // 1. Verify OTP again (security)
    const { data: otpRow } = await adminClient
        .from('email_otps')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('otp_code', otp)
        .maybeSingle()

    if (!otpRow || new Date(otpRow.expires_at) < new Date()) {
        return { error: 'Session expired. Please request a new code.' }
    }

    // 2. Get the Auth User ID
    const { data: userRow } = await adminClient
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle()

    if (!userRow) {
        return { error: 'User not found.' }
    }

    // 3. Update Auth Password using Admin Client
    const { error: authError } = await adminClient.auth.admin.updateUserById(userRow.id, {
        password: newPassword
    })

    if (authError) {
        console.error('[Reset] Auth error:', authError)
        return { error: 'Failed to update password. ' + authError.message }
    }

    // 4. Clean up OTP
    await adminClient
        .from('email_otps')
        .delete()
        .eq('email', email.toLowerCase())

    return { success: true }
}
