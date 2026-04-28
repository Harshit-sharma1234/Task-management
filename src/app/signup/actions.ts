'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, sendBulkEmails } from '@/lib/email'
import { newSignupNotificationEmail, emailVerificationEmail } from '@/lib/email-templates'
import { randomInt } from 'crypto'
import { getBaseUrl } from '@/lib/urls'
import { validatePassword } from '@/lib/validation'

const APP_URL = getBaseUrl()

export async function requestOTP(email: string) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { error: 'A valid email address is required.' }
    }

    const adminClient = createAdminClient()

    // ── Check duplicate email ──
    const { data: existingUser } = await adminClient
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle()

    if (existingUser) {
        return { error: 'An account with this email already exists. Please log in instead.' }
    }

    const otpCode = randomInt(100000, 999999).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

    // Issue #7: Rate limit — max 5 OTP requests per email per hour
    const { data: recentOtps } = await adminClient
        .from('email_otps')
        .select('created_at')
        .eq('email', email.toLowerCase())
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

    if (recentOtps && recentOtps.length >= 5) {
        return { error: 'Too many verification requests. Please try again in an hour.' }
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
        console.error('[OTP] Error saving OTP:', otpError)
        return { error: 'Failed to generate verification code.' }
    }

    const html = emailVerificationEmail({ otpCode, expiresInMinutes: 10 })
    const { success, error: emailError } = await sendEmail({
        to: email,
        subject: `Your Verification Code: ${otpCode}`,
        html
    })

    if (!success) {
        console.error('[OTP] Email error:', emailError)
        return { error: 'Failed to send verification email. Please try again.' }
    }

    return { success: true }
}

export async function verifyOTP(email: string, otp: string) {
    const adminClient = createAdminClient()

    const { data: otpRow, error } = await adminClient
        .from('email_otps')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('otp_code', otp)
        .maybeSingle()

    if (error || !otpRow) {
        return { error: 'Invalid verification code.' }
    }

    const now = new Date()
    if (new Date(otpRow.expires_at) < now) {
        return { error: 'Verification code has expired. Please request a new one.' }
    }

    const { error: updateError } = await adminClient
        .from('email_otps')
        .update({ verified: true })
        .eq('email', email.toLowerCase())

    if (updateError) {
        console.error('[OTP] Update verified error:', updateError)
        return { error: 'Failed to complete verification.' }
    }

    return { success: true }
}

export async function signup(prevState: any, formData: FormData) {
    const name = (formData.get('name') as string)?.trim()
    const email = (formData.get('email') as string)?.trim().toLowerCase()
    const employeeId = (formData.get('employee_id') as string)?.trim()
    const password = formData.get('password') as string

    // ── Validation ──
    if (!name || name.length < 2) {
        return { error: 'Full name is required (minimum 2 characters).' }
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { error: 'A valid email address is required.' }
    }
    if (!employeeId || employeeId.length < 2) {
        return { error: 'Employee ID is required.' }
    }
    if (!password) {
        return { error: 'Password is required.' }
    }
    const passwordCheck = validatePassword(password)
    if (!passwordCheck.valid) {
        return { error: passwordCheck.error }
    }

    const adminClient = createAdminClient()

    // ── Check duplicate email ──
    const { data: existingEmail } = await adminClient
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle()

    if (existingEmail) {
        return { error: 'An account with this email already exists. Please log in instead.' }
    }

    // ── Verify OTP Status ──
    const { data: otpData } = await adminClient
        .from('email_otps')
        .select('verified')
        .eq('email', email)
        .maybeSingle()

    if (!otpData || !otpData.verified) {
        return { error: 'Email has not been verified. Please verify your email first.' }
    }

    // ── Check duplicate employee ID ──
    const { data: existingEmpId } = await adminClient
        .from('users')
        .select('id')
        .eq('employee_id', employeeId)
        .maybeSingle()

    if (existingEmpId) {
        return { error: 'This Employee ID is already registered. Please contact your admin.' }
    }

    // ── Create Auth user (auto-confirmed, no Supabase email) ──
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name, employee_id: employeeId }
    })

    if (authError) {
        console.error('[Signup] Auth creation error:', authError)
        if (authError.message?.includes('already been registered')) {
            return { error: 'An account with this email already exists.' }
        }
        return { error: 'Failed to create account. Please try again.' }
    }

    const newUserId = authData.user.id

    // ── Upsert into public.users (avoids collision with the auto-sync trigger) ──
    const { error: dbError } = await adminClient
        .from('users')
        .upsert({
            id: newUserId,
            auth_id: newUserId,
            email,
            name,
            employee_id: employeeId
        }, { onConflict: 'id' })

    if (dbError) {
        console.error('[Signup] DB insert error:', dbError)
        // Rollback: delete the Auth user
        await adminClient.auth.admin.deleteUser(newUserId)
        
        if (dbError.message?.includes('users_employee_id_unique')) {
            return { error: 'This Employee ID is already registered.' }
        }
        return { error: 'Failed to create profile. Please try again.' }
    }

    // ── Redirect to login (user must log in, then choose/create a workspace) ──
    redirect('/login?message=Account created successfully! Please log in.')
}
