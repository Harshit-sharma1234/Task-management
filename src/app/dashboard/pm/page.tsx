import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardOverview, { StatsCards } from '@/components/dashboard/Overview'
import { StatsSkeleton } from '@/components/dashboard/OverviewSkeletons'
import { getServerUser, getServerProfile } from '@/lib/auth-server'
import { Suspense } from 'react'
import { getCachedUsers } from '@/lib/cache'
import { Metadata } from 'next'
import dynamic from 'next/dynamic'

const CreateProjectButton = dynamic(() => import('@/components/dashboard/CreateProjectButton').then(mod => mod.CreateProjectButton), { 
    loading: () => <div className="h-10 w-32 bg-gray-100 animate-pulse rounded-md" />
})

export const metadata: Metadata = {
  title: 'PM Dashboard',
}

export const revalidate = 60;

export default async function PMDashboard() {
    const user = await getServerUser()
    if (!user) redirect('/login')

    const profile = await getServerProfile(user.email!)
    if (!profile || profile.roles?.role_name !== 'Project Manager') {
        redirect('/dashboard')
    }

    const userName = user.user_metadata?.full_name || profile.name || user.email;

    return (
        <div className="flex flex-col h-full w-full p-8 overflow-y-auto animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Welcome back, {userName}</h1>
                    <p className="text-sm text-gray-500 mt-1">Here's what's happening with your projects today</p>
                </div>
                <CreateProjectButton variant="header" />
            </div>

            {/* Stats Overview */}
            <Suspense fallback={<StatsSkeleton />}>
                <StatsCards />
            </Suspense>

            {/* Main Content (Widgets) */}
            <DashboardOverview userId={user.id} />
        </div>
    )
}
