import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsTabs } from '@/app/dashboard/settings/SettingsTabs'

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData?.user) redirect('/login')

    // Fetch user profile from public.users table (regular select to avoid 406)
    const { data: profiles } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .eq('email', authData.user.email)
    
    const profile = profiles?.[0]

    const user = {
        id: profile?.id || authData.user.id,
        name: profile?.name || authData.user.user_metadata?.full_name || authData.user.email?.split('@')[0] || 'User',
        email: authData.user.email || '',
        avatar_url: profile?.avatar_url || null
    }

    return (
        <div className="p-8 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
            <SettingsTabs user={user} />
        </div>
    )
}
