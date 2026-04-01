import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TeamList } from '@/components/dashboard/TeamList'
import { TeamHeader } from '@/components/dashboard/TeamHeader'
import { TeamSkeleton } from '@/components/dashboard/TeamSkeleton'
import { Users, FolderKanban, Shield } from 'lucide-react'
import { getCachedUsers, getCachedStats, getCachedUserProfile } from '@/lib/cache'

export default async function TeamPage() {
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData?.user) redirect('/login')

    return (
        <Suspense fallback={<TeamSkeleton />}>
            <TeamContent email={authData.user.email!} />
        </Suspense>
    )
}

async function TeamContent({ email }: { email: string }) {
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
