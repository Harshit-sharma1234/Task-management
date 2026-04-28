'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getRolePath } from '@/lib/role-utils'

/**
 * Creates a new workspace and adds the creator as Admin.
 */
export async function createWorkspace(prevState: any, formData: FormData) {
    const name = (formData.get('name') as string)?.trim()
    const slug = (formData.get('slug') as string)?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')

    if (!name || name.length < 2) {
        return { error: 'Workspace name must be at least 2 characters.' }
    }
    if (!slug || slug.length < 2) {
        return { error: 'Workspace URL must be at least 2 characters.' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated.' }

    const adminClient = createAdminClient()

    // Get internal user ID
    const { data: userProfile } = await adminClient
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single()

    if (!userProfile) return { error: 'User profile not found.' }

    // Check slug availability
    const { data: existing } = await adminClient
        .from('workspaces')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()

    if (existing) {
        return { error: 'This workspace URL is already taken. Try a different one.' }
    }

    // Create workspace
    const { data: workspace, error: wsError } = await adminClient
        .from('workspaces')
        .insert({ name, slug, created_by: userProfile.id })
        .select()
        .single()

    if (wsError) {
        console.error('[createWorkspace] Error:', wsError)
        return { error: 'Failed to create workspace.' }
    }

    // Get Admin role ID
    const { data: adminRole } = await adminClient
        .from('roles')
        .select('id')
        .eq('role_name', 'Admin')
        .single()

    if (!adminRole) return { error: 'Admin role not found in database.' }

    // Add creator as Admin member
    const { error: memberError } = await adminClient
        .from('workspace_members')
        .insert({
            workspace_id: workspace.id,
            user_id: userProfile.id,
            role_id: adminRole.id,
        })

    if (memberError) {
        console.error('[createWorkspace] Member insert error:', memberError)
        return { error: 'Failed to add you as workspace admin.' }
    }

    // Set as last visited workspace
    await adminClient
        .from('users')
        .update({ last_workspace_id: workspace.id })
        .eq('id', userProfile.id)

    revalidatePath('/', 'layout')
    redirect(`/dashboard/${slug}/admin`)
}

/**
 * Joins a workspace via an invite token.
 */
export async function joinViaInvite(prevState: any, formData: FormData) {
    const tokenInput = (formData.get('token') as string)?.trim()
    if (!tokenInput) return { error: 'Please enter an invite token or link.' }

    // Extract token whether user pasted full URL or just the token
    const token = tokenInput.includes('/') ? tokenInput.split('/').pop()! : tokenInput

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated.' }

    const adminClient = createAdminClient()

    // Get internal user ID and email
    const { data: userProfile } = await adminClient
        .from('users')
        .select('id, email')
        .eq('auth_id', user.id)
        .single()

    if (!userProfile) return { error: 'User profile not found.' }

    // Validate the invite
    const { data: invite } = await adminClient
        .from('workspace_invites')
        .select('*, workspaces(slug)')
        .eq('token', token)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()

    if (!invite) {
        return { error: 'This invite link is invalid or has expired.' }
    }

    // Confirm the invite was sent to this user's email
    if (invite.email.toLowerCase() !== userProfile.email.toLowerCase()) {
        return { error: 'This invite was sent to a different email address.' }
    }

    // Check if already a member
    const { data: existingMember } = await adminClient
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', invite.workspace_id)
        .eq('user_id', userProfile.id)
        .maybeSingle()

    if (existingMember) {
        return { error: 'You are already a member of this workspace.' }
    }

    // Add user to workspace
    const { error: insertError } = await adminClient
        .from('workspace_members')
        .insert({
            workspace_id: invite.workspace_id,
            user_id: userProfile.id,
            role_id: invite.role_id,
        })

    if (insertError) {
        console.error('[joinViaInvite] Insert error:', insertError)
        return { error: 'Failed to join workspace.' }
    }

    // Mark invite as accepted
    await adminClient
        .from('workspace_invites')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invite.id)

    // Set as last visited workspace
    await adminClient
        .from('users')
        .update({ last_workspace_id: invite.workspace_id })
        .eq('id', userProfile.id)

    // Get role name for routing
    const { data: role } = await adminClient
        .from('roles')
        .select('role_name')
        .eq('id', invite.role_id)
        .single()

    const rolePath = getRolePath(role?.role_name || 'Junior Developer')
    const workspaceSlug = (invite as any).workspaces?.slug || 'default'

    revalidatePath('/', 'layout')
    redirect(`/dashboard/${workspaceSlug}/${rolePath}`)
}

/**
 * Selects a workspace and redirects to it.
 */
export async function selectWorkspace(workspaceId: string, workspaceSlug: string, roleName: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const adminClient = createAdminClient()

    const { data: userProfile } = await adminClient
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single()

    if (userProfile) {
        await adminClient
            .from('users')
            .update({ last_workspace_id: workspaceId })
            .eq('id', userProfile.id)
    }

    const rolePath = getRolePath(roleName)
    redirect(`/dashboard/${workspaceSlug}/${rolePath}`)
}

