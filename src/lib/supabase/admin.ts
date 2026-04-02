import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _adminClient: SupabaseClient | null = null

export const createAdminClient = () => {
    if (_adminClient) return _adminClient

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase Admin environment variables')
    }

    _adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })

    return _adminClient
}
