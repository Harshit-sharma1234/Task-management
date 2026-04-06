import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Code } from 'lucide-react'
import DashboardOverview from '@/components/dashboard/Overview'
import { Suspense } from 'react'
import { OverviewSkeleton } from '@/components/dashboard/OverviewSkeleton'
import { getCachedUserProfile } from '@/lib/cache'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Developer Dashboard',
}

export const revalidate = 60;

export default function DevDashboard() {
    return (
        <div className="flex flex-col h-full w-full">
            <Suspense fallback={<OverviewSkeleton />}>
                <DevContent />
            </Suspense>
        </div>
    )
}

async function DevContent() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const profile = await getCachedUserProfile(user.email!)
    if (!profile || (profile.roles?.role_name !== 'Senior Developer' && profile.roles?.role_name !== 'Junior Developer')) {
        redirect('/dashboard')
    }
    return <DashboardOverview userId={user.id} userName={user.user_metadata?.full_name || profile.name} />
}
