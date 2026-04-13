'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserProfile } from '@/lib/roles'
import { revalidateTag, revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email'
import { onboardingApprovedEmail, onboardingRejectedEmail } from '@/lib/email-templates'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Fetch all pending onboarding requests with user details.
 * Only callable by Admin/PM.
 */
export async function fetchPendingOnboardingRequests() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'Not authenticated' }
    }

    const profile = await getUserProfile(supabase, user.email!)
    if (!profile || !['Admin', 'Project Manager'].includes(profile.roles?.role_name || '')) {
        return { error: 'Unauthorized' }
    }

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
        .from('onboarding_requests')
        .select(`
            id,
            status,
            requested_at,
            rejection_reason,
            users:user_id (
                id,
                name,
                email,
                employee_id
            )
        `)
        .eq('status', 'pending')
        .order('requested_at', { ascending: true })

    if (error) {
        console.error('[Onboarding] Error fetching requests:', error)
        return { error: error.message }
    }

    return { data: data || [] }
}

/**
 * Approve an onboarding request — assigns role and notifies employee.
 */
export async function approveOnboarding(requestId: string, roleId: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'Not authenticated' }
    }

    // 1. Verify caller is Admin/PM
    const profile = await getUserProfile(supabase, user.email!)
    if (!profile || !['Admin', 'Project Manager'].includes(profile.roles?.role_name || '')) {
        return { error: 'Unauthorized: Only Admins and PMs can approve onboarding.' }
    }

    if (!roleId) {
        return { error: 'A role must be selected before approving.' }
    }

    const adminClient = createAdminClient()

    // 2. Re-read the request to prevent TOCTOU / double-approval
    const { data: request, error: fetchError } = await adminClient
        .from('onboarding_requests')
        .select('id, status, user_id')
        .eq('id', requestId)
        .single()

    if (fetchError || !request) {
        return { error: 'Onboarding request not found.' }
    }
    if (request.status !== 'pending') {
        return { error: `This request has already been ${request.status}.` }
    }

    // 3. Update the onboarding request
    const { error: reqError } = await adminClient
        .from('onboarding_requests')
        .update({
            status: 'approved',
            reviewed_by: profile.id,
            reviewed_at: new Date().toISOString(),
            assigned_role_id: roleId,
        })
        .eq('id', requestId)

    if (reqError) {
        console.error('[Onboarding] Error updating request:', reqError)
        return { error: 'Failed to update onboarding request.' }
    }

    // 4. Update the user record — assign role + mark as approved
    const { error: userError } = await adminClient
        .from('users')
        .update({
            role_id: roleId,
            onboarding_status: 'approved',
        })
        .eq('id', request.user_id)

    if (userError) {
        console.error('[Onboarding] Error updating user:', userError)
        return { error: 'Failed to assign role to user.' }
    }

    // 5. Fetch user details + role name for the email
    const [{ data: employeeData }, { data: roleData }] = await Promise.all([
        adminClient.from('users').select('name, email').eq('id', request.user_id).single(),
        adminClient.from('roles').select('role_name').eq('id', roleId).single(),
    ])

    // 6. Send approval email (fire-and-forget)
    if (employeeData?.email) {
        sendEmail({
            to: employeeData.email,
            subject: '🎉 Welcome to Tectome — Your Access is Ready',
            html: onboardingApprovedEmail({
                employeeName: employeeData.name || 'there',
                roleName: roleData?.role_name || 'Team Member',
                loginUrl: `${APP_URL}/login`,
            }),
        }).then(result => {
            if (result.success) {
                // Update email sent timestamp (non-blocking)
                adminClient
                    .from('onboarding_requests')
                    .update({ approval_email_sent_at: new Date().toISOString() })
                    .eq('id', requestId)
                    .then(() => {})
            }
        }).catch(err => {
            console.error('[Onboarding] Approval email failed:', err)
        })
    }

    // 7. Revalidate caches
    revalidateTag('team-members', 'max')
    revalidateTag('onboarding-requests', 'max')
    revalidatePath('/dashboard/onboarding', 'page')

    return { success: true, message: `${employeeData?.name || 'User'} has been approved as ${roleData?.role_name || 'Team Member'}.` }
}

/**
 * Reject an onboarding request — optionally with a reason.
 */
export async function rejectOnboarding(requestId: string, reason?: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'Not authenticated' }
    }

    const profile = await getUserProfile(supabase, user.email!)
    if (!profile || !['Admin', 'Project Manager'].includes(profile.roles?.role_name || '')) {
        return { error: 'Unauthorized' }
    }

    const adminClient = createAdminClient()

    // Prevent double-processing
    const { data: request } = await adminClient
        .from('onboarding_requests')
        .select('id, status, user_id')
        .eq('id', requestId)
        .single()

    if (!request || request.status !== 'pending') {
        return { error: 'Request not found or already processed.' }
    }

    // Update request
    const { error: reqError } = await adminClient
        .from('onboarding_requests')
        .update({
            status: 'rejected',
            reviewed_by: profile.id,
            reviewed_at: new Date().toISOString(),
            rejection_reason: reason || null,
        })
        .eq('id', requestId)

    if (reqError) {
        return { error: 'Failed to reject request.' }
    }

    // Update user status
    await adminClient
        .from('users')
        .update({ onboarding_status: 'rejected' })
        .eq('id', request.user_id)

    // Send rejection email
    const { data: employeeData } = await adminClient
        .from('users')
        .select('name, email')
        .eq('id', request.user_id)
        .single()

    if (employeeData?.email) {
        sendEmail({
            to: employeeData.email,
            subject: 'Tectome — Onboarding Update',
            html: onboardingRejectedEmail({
                employeeName: employeeData.name || 'there',
                reason: reason || undefined,
            }),
        }).catch(err => {
            console.error('[Onboarding] Rejection email failed:', err)
        })
    }

    revalidateTag('onboarding-requests', 'max')
    revalidatePath('/dashboard/onboarding', 'page')

    return { success: true }
}

/**
 * Fetch count of pending onboarding requests (for sidebar badge).
 */
export async function fetchPendingOnboardingCount() {
    const adminClient = createAdminClient()
    const { count, error } = await adminClient
        .from('onboarding_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

    if (error) {
        console.error('[Onboarding] Error fetching pending count:', error)
        return 0
    }

    return count || 0
}
