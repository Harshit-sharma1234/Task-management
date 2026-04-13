import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Code } from 'lucide-react'
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
  title: 'Developer Dashboard',
}

export const revalidate = 60;

export default async function DevDashboard() {
    const user = await getServerUser()
    if (!user) redirect('/login')

    const profile = await getServerProfile(user.email!)
    if (!profile || (profile.roles?.role_name !== 'Senior Developer' && profile.roles?.role_name !== 'Junior Developer')) {
        redirect('/dashboard')
    }

    const userName = user.user_metadata?.full_name || profile.name || user.email;

    return (
        <div className="flex flex-col h-full w-full p-10 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-10">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                        Welcome back, <span className="text-indigo-600">{userName}</span>
                    </h1>
                    <p className="text-[15px] font-medium text-slate-500 mt-2">
                        Here's an overview of your active workspace today.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live System Status</span>
                    </div>
                    <CreateProjectButton variant="header" />
                </div>
            </div>

            {/* Stats Overview */}
            <Suspense fallback={<StatsSkeleton />}>
                <StatsCards userId={user.id} />
            </Suspense>

            {/* Main Content (Widgets) */}
            <DashboardOverview userId={user.id} />
        </div>
    )
}
