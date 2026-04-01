import { SupabaseClient } from '@supabase/supabase-js'

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
    email: string
): Promise<UserProfile | null> {
    const { data, error } = await supabase
        .from('users')
        .select('*, roles(role_name)')
        .eq('email', email)
    
    const userRow = data?.[0] || null

    if (error || !userRow) return null
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
