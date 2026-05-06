import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import DashboardOverview, { StatsCards } from '@/components/dashboard/Overview'
import { StatsSkeleton } from '@/components/dashboard/OverviewSkeletons'
import { getServerUser } from '@/lib/auth-server'
import { getCachedWorkspaceBySlug, getCachedUserProfile } from '@/lib/cache'
import { Metadata } from 'next'
import nextDynamic from 'next/dynamic'

const CreateProjectButton = nextDynamic(() => import('@/components/dashboard/CreateProjectButton').then(mod => mod.CreateProjectButton), {
    loading: () => <div className="h-10 w-32 bg-gray-100 animate-pulse rounded-md" />
})

export const metadata: Metadata = {
    title: 'Developer Dashboard',
}

export const dynamic = 'force-dynamic';

export default async function SeniorDevDashboard({ params }: { params: Promise<{ workspace: string }> }) {
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
        <div className="flex flex-col h-full w-full p-10 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
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
                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-emerald-100 rounded-xl shadow-sm shadow-emerald-50/50">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-widest">Senior Developer</span>
                    </div>
                    <CreateProjectButton variant="header" workspaceId={workspace.id} />
                </div>
            </div>

            <Suspense fallback={<StatsSkeleton />}>
                <StatsCards userId={profile.id} workspaceId={workspace.id} workspaceSlug={workspace.slug} />
            </Suspense>

            <DashboardOverview userId={profile.id} workspaceId={workspace.id} workspaceSlug={workspace.slug} userRole="Developer" />
        </div>
    )
}
