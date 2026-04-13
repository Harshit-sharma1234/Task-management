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

    // ── Insert into public.users (pending, no role) ──
    const { error: dbError } = await adminClient
        .from('users')
        .insert({
            id: newUserId,
            auth_id: newUserId,
            email,
            name,
            employee_id: employeeId,
            role_id: null,
            onboarding_status: 'pending'
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

    // ── Create onboarding request ──
    const { error: reqError } = await adminClient
        .from('onboarding_requests')
        .insert({
            user_id: newUserId,
            status: 'pending'
        })

    if (reqError) {
        console.error('[Signup] Onboarding request insert error:', reqError)
        // Non-critical — the user row already has onboarding_status='pending'
    }

    // ── Notify Admin/PM users (fire-and-forget) ──
    notifyAdmins(adminClient, { name, email, employeeId }).catch(err => {
        console.error('[Signup] Email notification error (non-blocking):', err)
    })

    // ── Redirect to pending page ──
    redirect('/onboarding-pending')
}

/**
 * Send notification emails to all users with Admin or PM role.
 * Runs asynchronously — does not block signup response.
 */
async function notifyAdmins(
    adminClient: ReturnType<typeof createAdminClient>,
    employee: { name: string; email: string; employeeId: string }
) {
    // Fetch Admin and PM users
    const { data: adminPmUsers } = await adminClient
        .from('users')
        .select('email, roles!inner(role_name)')
        .in('roles.role_name', ['Admin', 'Project Manager'])

    if (!adminPmUsers || adminPmUsers.length === 0) {
        console.warn('[Signup] No Admin/PM users found to notify')
        return
    }

    const recipientEmails = adminPmUsers.map((u: any) => u.email).filter(Boolean) as string[]
    const approvalUrl = `${APP_URL}/dashboard/onboarding`

    const html = newSignupNotificationEmail({
        employeeName: employee.name,
        employeeEmail: employee.email,
        employeeId: employee.employeeId,
        approvalUrl
    })

    await sendBulkEmails(
        recipientEmails,
        `🆕 New Employee Signup: ${employee.name}`,
        html
    )

    // Update notification_sent_at timestamp
    const { data: userRow } = await adminClient
        .from('users')
        .select('id')
        .eq('email', employee.email)
        .maybeSingle()

    if (userRow) {
        await adminClient
            .from('onboarding_requests')
            .update({ notification_sent_at: new Date().toISOString() })
            .eq('user_id', userRow.id)
    }
}
