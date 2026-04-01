import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/roles'
import { Briefcase } from 'lucide-react'
import DashboardOverview from '@/components/dashboard/Overview'
import { Suspense } from 'react'
import OverviewSkeleton from '@/components/dashboard/OverviewSkeleton'
import { getCachedUserProfile } from '@/lib/cache'

export const revalidate = 60; // ISR: Revalidate every 60 seconds

export default async function PMDashboard() {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data?.user) redirect('/login')

    const profile = await getCachedUserProfile(data.user.email!)
    if (!profile || profile.roles?.role_name !== 'Project Manager') {
        redirect('/dashboard')
    }

    return (
        <div className="flex flex-col h-full w-full">
            <div className="px-8 pt-6 pb-0 flex items-center justify-end">
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/25 flex items-center shadow-sm">
                    <Briefcase size={12} className="mr-1" />
                    Project Manager View
                </span>
            </div>
            <Suspense fallback={<OverviewSkeleton />}>
                <DashboardOverview />
            </Suspense>
        </div>
    )
}
