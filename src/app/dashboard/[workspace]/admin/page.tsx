import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import DashboardOverview, { StatsCards } from '@/components/dashboard/Overview'
import { StatsSkeleton } from '@/components/dashboard/OverviewSkeletons'
import { getServerUser } from '@/lib/auth-server'
import { getCachedWorkspaceBySlug, getCachedUserProfile } from '@/lib/cache'
import { Metadata } from 'next'
import dynamic from 'next/dynamic'

const CreateProjectButton = dynamic(() => import('@/components/dashboard/CreateProjectButton').then(mod => mod.CreateProjectButton), { 
    loading: () => <div className="h-10 w-32 bg-gray-100 animate-pulse rounded-md" />
})

export const metadata: Metadata = {
    title: 'Admin Dashboard',
}

export const revalidate = 60;

export default async function AdminDashboard({ params }: { params: Promise<{ workspace: string }> }) {
    const { workspace: workspaceSlug } = await params;
    const [user, workspace] = await Promise.all([
        getServerUser(),
        getCachedWorkspaceBySlug(workspaceSlug)
    ]);

    if (!user) redirect('/login')
    if (!workspace) redirect('/dashboard')

    const profile = await getCachedUserProfile(user.email!);
    if (!profile) redirect('/login')

    const userName = profile.name || user.user_metadata?.full_name || user.email;

    return (
        <div className="flex flex-col h-full w-full p-4 sm:p-8 lg:p-10 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300 no-scrollbar">
            <div className="flex flex-col gap-4 mb-8 sm:mb-10">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    Welcome back, <span className="text-indigo-600">{userName}</span>
                </h1>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <p className="text-sm sm:text-[15px] font-medium text-slate-500">
                        System overview and workspace management.
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-100 rounded-xl shadow-sm shadow-indigo-50/50 w-fit">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[10px] sm:text-[11px] font-extrabold text-indigo-600 uppercase tracking-widest">System Administrator</span>
                        </div>
                        <div className="w-full sm:w-auto">
                            <CreateProjectButton variant="header" workspaceId={workspace.id} />
                        </div>
                    </div>
                </div>
            </div>

            <Suspense fallback={<StatsSkeleton />}>
                <StatsCards userId={profile.id} workspaceId={workspace.id} workspaceSlug={workspace.slug} />
            </Suspense>

            <DashboardOverview userId={profile.id} workspaceId={workspace.id} workspaceSlug={workspace.slug} userRole="Admin" />
        </div>
    )
}
