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
            <div className="px-8 pt-6 pb-0 flex items-center justify-end">
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 flex items-center shadow-sm">
                    <Code size={12} className="mr-1" />
                    Developer View
                </span>
            </div>
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
