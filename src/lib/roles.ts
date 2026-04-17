import { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from './supabase/admin'

export type AppRole = 'Admin' | 'Project Manager' | 'Senior Developer' | 'Junior Developer'

export interface UserProfile {
    id: string
    employee_id: string
    name: string
    email: string
    avatar_url?: string | null
    roles: {
        role_name: AppRole
    } | null
}

/**
 * Fetch a user's profile from public.users.
 * Role is resolved from workspace_members if workspaceId is provided.
 * Returns null if the user is not found.
 */
export async function getUserProfile(
    supabase: SupabaseClient,
    email: string,
    id?: string,
    workspaceId?: string
): Promise<UserProfile | null> {
    const adminClient = createAdminClient()
    
    // 1. Fetch user base profile (no global role_id anymore)
    let query = adminClient.from('users').select('id, auth_id, email, name, employee_id, avatar_url')
    
    if (id) {
        query = query.or(`id.eq.${id},auth_id.eq.${id},email.eq.${email}`)
    } else {
        query = query.eq('email', email)
    }

    const { data, error } = await query
    const userRow = data?.[0] || null

    if (error || !userRow) {
        // Proactive sync: if user exists in Auth but not in public.users
        if (!id) return null
        
        const { data: { user: authUser }, error: authError } = await adminClient.auth.admin.getUserById(id)
        if (authError || !authUser) return null

        const { data: newUser, error: syncError } = await adminClient.from('users').upsert({
            id: authUser.id,
            auth_id: authUser.id,
            email: authUser.email,
            name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Unknown',
            avatar_url: authUser.user_metadata?.avatar_url || null,
            employee_id: authUser.user_metadata?.employee_id || `EMP-${authUser.id.substring(0, 8).toUpperCase()}`
        }, { onConflict: 'id' }).select('id, auth_id, email, name, employee_id, avatar_url').single()

        if (syncError || !newUser) return null
        
        return { ...newUser, roles: null } as UserProfile
    }

    // 2. If workspaceId provided, get role from workspace_members
    let roles: { role_name: AppRole } | null = null

    if (workspaceId) {
        const { data: membership } = await adminClient
            .from('workspace_members')
            .select('roles(role_name)')
            .eq('workspace_id', workspaceId)
            .eq('user_id', userRow.id)
            .single()

        if (membership?.roles) {
            const r = Array.isArray(membership.roles) ? membership.roles[0] : membership.roles
            roles = r as { role_name: AppRole }
        }
    }

    return {
        ...userRow,
        roles,
    } as UserProfile
}

/**
 * Get the dashboard path for a given role.
 */
export function getDashboardPath(role: AppRole): string {
    switch (role) {
        case 'Admin':
            return '/dashboard/admin'
        case 'Project Manager':
            return '/dashboard/pm'
        case 'Senior Developer':
            return '/dashboard/dev'
        case 'Junior Developer':
            return '/dashboard/dev'
        default:
            return '/dashboard'
    }
}

/**
 * Convert role name to URL-safe path segment.
 */
export function getRolePath(roleName: string): string {
    switch (roleName) {
        case 'Admin': return 'admin'
        case 'Project Manager': return 'project-manager'
        case 'Senior Developer': return 'senior-developer'
        case 'Junior Developer': return 'junior-developer'
        default: return 'junior-developer'
    }
}
