import { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from './supabase/admin'

export type AppRole = 'Admin' | 'Project Manager' | 'Developer'

export interface UserProfile {
    id: string
    employee_id: string
    name: string
    email: string
    role_id: string
    roles: {
        role_name: AppRole
    }
}


/**
 * Fetch a user's profile + role from the users/roles tables.
 * Returns null if the email is not found in the users table.
 */
export async function getUserProfile(
    supabase: SupabaseClient,
    email: string,
    id?: string
): Promise<UserProfile | null> {
    const { data, error } = await supabase
        .from('users')
        .select('*, roles(role_name)')
        .eq('email', email)

    const userRow = data?.[0] || null

    console.log('[getUserProfile] email:', email)
    console.log('[getUserProfile] data:', JSON.stringify(data))
    console.log('[getUserProfile] error:', JSON.stringify(error))

    if (error) return null

    if (!userRow) {
        console.log('[getUserProfile] User not found in public table, attempting proactive sync...')
        // Proactive sync for missing users
        const adminClient = createAdminClient()
        let authUser = null;

        if (id) {
            const { data: { user }, error: getError } = await adminClient.auth.admin.getUserById(id)
            if (user) authUser = user
        } else {
            const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers()
            authUser = authUsers?.find(u => u.email === email)
        }

        if (authUser) {
            const developerRoleId = 'ebd19f94-ad1e-4949-a2c4-36127425a718'
            const { data: newNode, error: syncError } = await adminClient.from('users').upsert({
                id: authUser.id,
                auth_id: authUser.id,
                email: authUser.email,
                name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Unknown',
                avatar_url: authUser.user_metadata?.avatar_url || null,
                role_id: authUser.user_metadata?.role_id || developerRoleId,
                employee_id: authUser.user_metadata?.employee_id || `EMP-${authUser.id.substring(0, 8).toUpperCase()}`
            }, { onConflict: 'id' }).select('*, roles(role_name)').single()

            if (!syncError && newNode) return newNode as UserProfile
        }
        return null
    }

    return userRow as UserProfile
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
        case 'Developer':
            return '/dashboard/dev'
        default:
            return '/dashboard'
    }
}
