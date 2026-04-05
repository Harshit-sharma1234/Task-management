import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TeamList } from '@/components/dashboard/TeamList'
import { TeamHeader } from '@/components/dashboard/TeamHeader'
import { TeamSkeleton } from '@/components/dashboard/TeamSkeleton'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Team Directory',
  description: 'View and manage your team members and roles.',
}
import { Users, FolderKanban, Shield } from 'lucide-react'
import { getCachedUsers, getCachedStats, getCachedUserProfile } from '@/lib/cache'

export default function TeamPage() {
    return (
        <Suspense fallback={<TeamSkeleton />}>
            <TeamContent />
        </Suspense>
    )
}

async function TeamContent() {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    const email = authData?.user?.email;

    if (!email) redirect('/login')
    // Use cached data fetching instead of direct Supabase calls
    // Note: getCachedUserProfile returns a result, while getCachedUsers/getCachedStats are already the cached functions
    const [currentUserProfile, users, stats] = await Promise.all([
        getCachedUserProfile(email),
        getCachedUsers(),
        getCachedStats()
    ]);

    const isAdmin = currentUserProfile?.roles?.role_name === 'Admin'
    const projectsCount = stats.projectsCount
    const tasksCount = stats.tasksCount

    return (
        <div className="p-8 max-w-7xl mx-auto flex flex-col gap-6 w-full h-full">
            {/* Header */}
            <TeamHeader isAdmin={isAdmin} />

            {/* Team List with Search */}
            <TeamList initialUsers={users} />
        </div>
    )
}
