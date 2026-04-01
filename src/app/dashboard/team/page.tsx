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
        <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8 w-full h-full">
            {/* Header */}
            <TeamHeader isAdmin={isAdmin} />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Total Members</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-2">{users.length}</h3>
                        </div>
                        <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-500">
                            <Users size={20} />
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Active Projects</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-2">{projectsCount}</h3>
                        </div>
                        <div className="bg-green-50 p-2.5 rounded-lg text-green-500">
                            <FolderKanban size={20} />
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Total Tasks</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-2">{tasksCount}</h3>
                        </div>
                        <div className="bg-purple-50 p-2.5 rounded-lg text-purple-500">
                            <Shield size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Team List with Search */}
            <TeamList initialUsers={users} />
        </div>
    )
}
