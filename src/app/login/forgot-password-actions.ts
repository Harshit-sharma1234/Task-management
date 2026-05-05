'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { randomInt } from 'crypto'
import { baseLayout } from '@/lib/email-templates' // Re-import baseLayout logic or similar

import { validateEmail, validatePassword } from '@/lib/validation'

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
    const emailCheck = validateEmail(email)
    if (!emailCheck.valid) {
        return { error: emailCheck.error || 'Invalid email address' }
    }

    const adminClient = createAdminClient()

    // 1. Verify user exists
    const searchEmail = email.trim().toLowerCase()
    
    // Debug: check admin client and env vars
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('[Reset OTP] CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing in server environment!')
        return { error: 'Server configuration error. Please contact support.' }
    }

    const { data: user, error: dbError } = await adminClient
        .from('users')
        .select('id')
        .ilike('email', searchEmail)
        .maybeSingle()

    if (dbError) {
        console.error('[Reset OTP] DB Error:', dbError)
        return { error: `Database error: ${dbError.message}` }
    }

    if (!user) {
        console.log(`[Reset OTP] User not found for: "${searchEmail}"`)
        return { error: `Invalid email: No account found for ${searchEmail}` }
    }

    const otpCode = randomInt(100000, 999999).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes

    // Issue #7: Rate limit — max 5 reset requests per email per hour
    const { data: recentOtps } = await adminClient
        .from('email_otps')
        .select('created_at')
        .eq('email', email.toLowerCase())
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

    if (recentOtps && recentOtps.length >= 5) {
        return { error: 'Too many reset requests. Please try again in an hour.' }
    }

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
    
    console.log(`[Reset OTP] Attempting to send email via Gmail to ${email}...`);
    const { success, error: emailError } = await sendEmail({
        to: email,
        subject: `Your Tectome password reset`,
        html
    })

    if (!success) {
        console.error('[Reset OTP] Gmail SMTP error:', emailError)
        return { error: 'Failed to send reset email. Please try again.' }
    }

    console.log(`[Reset OTP] Email sent successfully to ${email}`);
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
    // Server-side password strength check
    const passwordCheck = validatePassword(newPassword)
    if (!passwordCheck.valid) {
        return { error: passwordCheck.error }
    }

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
