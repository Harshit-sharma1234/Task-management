import { SupabaseClient, createClient } from '@supabase/supabase-js'

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

// Create a public client without cookies to bypass any broken Next.js sessions during signup
const publicSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Fetch a user's profile + role from the users/roles tables.
 * Returns null if the email is not found in the users table.
 */
export async function getUserProfile(
    supabase: SupabaseClient, // Kept for backwards compatibility in args, but ignored inside
    email: string
): Promise<UserProfile | null> {
    const { data, error } = await publicSupabase
        .from('users')
        .select('*, roles(role_name)')
        .eq('email', email)
        .single()

    console.log('[getUserProfile] email:', email)
    console.log('[getUserProfile] data:', JSON.stringify(data))
    console.log('[getUserProfile] error:', JSON.stringify(error))

    if (error || !data) return null
    return data as UserProfile
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
