'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, sendBulkEmails } from '@/lib/email'
import { newSignupNotificationEmail, emailVerificationEmail } from '@/lib/email-templates'
import { randomInt } from 'crypto'
import { getBaseUrl } from '@/lib/urls'

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
    if (!password || password.length < 6) {
        return { error: 'Password must be at least 6 characters.' }
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

    // ── Insert into public.users (minimal fields) ──
    const { error: dbError } = await adminClient
        .from('users')
        .insert({
            id: newUserId,
            auth_id: newUserId,
            email,
            name,
            employee_id: employeeId
        })

    if (dbError) {
        console.error('[Signup] DB insert error:', dbError)
        // Rollback: delete the Auth user
        await adminClient.auth.admin.deleteUser(newUserId)
        
        if (dbError.message?.includes('users_employee_id_unique')) {
            return { error: 'This Employee ID is already registered.' }
        }
        return { error: 'Failed to create profile. Please try again.' }
    }

    // ── Sign in the user immediately to establish session ──
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
    })

    if (signInError) {
        console.error('[Signup] Auto-login error:', signInError)
        // Non-blocking for the signup itself, but user will have to manually login
        return redirect('/login?message=Account created. Please log in.')
    }

    // ── Redirect to workspace page ──
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/', 'layout')
    redirect('/workspace')
}
