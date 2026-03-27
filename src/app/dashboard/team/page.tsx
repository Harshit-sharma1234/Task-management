import { redirect } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import { TeamList } from '../../../components/dashboard/TeamList'
import { Users, FolderKanban, Shield } from 'lucide-react'

export default async function TeamPage() {
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData?.user) redirect('/login')

    // 1. Fetch Users + Roles
    const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
            *,
            roles (
                role_name
            )
        `)
        .order('name')

    // 2. Fetch Projects count
    const { count: projectsCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })

    // 3. Fetch Tasks count
    const { count: tasksCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })

    const users = usersData || []

    return (
        <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8 w-full h-full">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Team</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage team members and their contributions</p>
                </div>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2">
                    <span className="flex items-center justify-center border border-white/40 rounded-full w-4 h-4 text-[10px] font-bold leading-none">+</span>
                    Invite Member
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Total Members</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-2">{users.length}</h3>
                        </div>
                        <div className="bg-blue-50 p-2.5 rounded-lg text-blue-500">
                            <Users size={20} />
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Active Projects</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-2">{projectsCount || 0}</h3>
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
                            <h3 className="text-3xl font-bold text-gray-900 mt-2">{tasksCount || 0}</h3>
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
