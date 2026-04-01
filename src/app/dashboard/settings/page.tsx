import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsTabs } from '@/app/dashboard/settings/SettingsTabs'
import { SettingsSkeleton } from '@/components/dashboard/SettingsSkeleton'
import { getCachedUserProfile } from '@/lib/cache'

export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData?.user) redirect('/login')

    return (
        <div className="p-8 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] w-full">
            <Suspense fallback={<SettingsSkeleton />}>
                <SettingsContent authUser={authData.user} />
            </Suspense>
        </div>
    )
}

async function SettingsContent({ authUser }: { authUser: any }) {
    // Use the cached version of the user profile
    const profile = await getCachedUserProfile(authUser.email!)

    const user = {
        id: profile?.id || authUser.id,
        name: profile?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        email: authUser.email || '',
        avatar_url: profile?.avatar_url || null
    }

    return <SettingsTabs user={user} />
}
