import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Code } from 'lucide-react'
import DashboardOverview from '@/components/dashboard/Overview'
import { Suspense } from 'react'
import OverviewSkeleton from '@/components/dashboard/OverviewSkeleton'
import { getCachedUserProfile } from '@/lib/cache'

export const revalidate = 60;

export default async function DevDashboard() {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data?.user) redirect('/login')

    return (
        <div className="flex flex-col h-full w-full">
            <Suspense fallback={<OverviewSkeleton />}>
                <DevContent email={data.user.email!} userId={data.user.id} userName={data.user.user_metadata?.full_name} />
            </Suspense>
        </div>
    )
}

async function DevContent({ email, userId, userName }: { email: string; userId: string; userName?: string }) {
    const profile = await getCachedUserProfile(email)
    if (!profile || (profile.roles?.role_name !== 'Senior Developer' && profile.roles?.role_name !== 'Junior Developer')) {
        redirect('/dashboard')
    }
    return <DashboardOverview userId={userId} userName={userName || profile.name || email} />
}
