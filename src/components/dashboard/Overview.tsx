import { createClient } from '@/lib/supabase/server'
import {
    Folder,
    CheckCircle2,
    Users,
    AlertTriangle,
    ArrowRight,
    Clock
} from 'lucide-react'
import Link from 'next/link'
import { CreateProjectButton } from '@/components/dashboard/CreateProjectButton'

export default async function DashboardOverview() {
    const supabase = await createClient()
    // Fetch all data in parallel
    const [userResponse, projectsResponse, usersResponse] = await Promise.all([
        supabase.auth.getUser(),
        supabase
            .from('projects')
            .select('id, project_name, description, created_at')
            .order('created_at', { ascending: false }),
        supabase
            .from('users')
            .select('id, name')
    ]);

    const { data: userData } = userResponse;
    const { data: projectsData } = projectsResponse;
    const { data: usersData } = usersResponse;

    const userName = userData?.user?.user_metadata?.full_name || 'Khushi Tailor'
    const projects = projectsData || []
    const users = usersData || []

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Welcome back, {userName}</h1>
                    <p className="text-sm text-gray-500 mt-1">Here's what's happening with your projects today</p>
                </div>
                <CreateProjectButton variant="header" users={users} />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Total Projects */}
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Total Projects</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-2">{projects.length}</h3>
                        </div>
                        <div className="bg-blue-50 p-2.5 rounded-lg text-blue-600">
                            <Folder size={20} />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-3">projects in {userName.split(' ')[0]}</p>
                </div>

                {/* Completed Projects */}
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Completed Projects</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-2">0</h3>
                        </div>
                        <div className="bg-green-50 p-2.5 rounded-lg text-green-500">
                            <CheckCircle2 size={20} />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-3">of 0 total</p>
                </div>

                {/* My Tasks */}
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">My Tasks</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-2">0</h3>
                        </div>
                        <div className="bg-purple-50 p-2.5 rounded-lg text-purple-500">
                            <Users size={20} />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-3">assigned to me</p>
                </div>

                {/* Overdue */}
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Overdue</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-2">0</h3>
                        </div>
                        <div className="bg-orange-50 p-2.5 rounded-lg text-orange-500">
                            <AlertTriangle size={20} />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-3">need attention</p>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (Project Overview & Recent Activity) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Project Overview */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-base font-semibold text-gray-900">Project Overview</h2>
                            <Link href="/dashboard/projects" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 group">
                                View all <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </div>

                        {projects.length === 0 ? (
                            <div className="bg-white border border-gray-100 rounded-xl p-12 shadow-sm flex flex-col items-center justify-center min-h-[320px]">
                                <div className="bg-gray-100 p-4 rounded-full text-gray-400 mb-4">
                                    <Folder size={32} />
                                </div>
                                <h3 className="text-gray-900 font-medium mb-4">No projects yet</h3>
                                <CreateProjectButton variant="empty-state" users={users} />
                            </div>
                        ) : (
                            <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[320px]">
                                <div className="grid grid-cols-1 divide-y divide-gray-100 flex-1">
                                    {projects.map((project: any) => (
                                        <div key={project.id} className="p-5 hover:bg-gray-50 transition-colors flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
                                                    <Folder size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-semibold text-gray-900">{project.project_name}</h3>
                                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{project.description || 'No description'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${
                                                    project.status === 'done' ? 'bg-green-500' :
                                                    project.status === 'in_progress' ? 'bg-blue-500' :
                                                    project.status === 'cancelled' ? 'bg-red-500' :
                                                    'bg-orange-500'
                                                }`}></div>
                                                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-tight">
                                                    {project.status ? project.status.replace('_', ' ') : 'backlog'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Recent Activity */}
                    <div>
                        <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Activity</h2>
                        <div className="bg-white border border-gray-100 rounded-xl p-12 shadow-sm flex flex-col items-center justify-center min-h-[200px]">
                            <div className="bg-gray-100 p-3 rounded-full text-gray-400">
                                <Clock size={24} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column (Task Statuses) */}
                <div className="flex flex-col gap-4">
                    {/* My Tasks Small Card */}
                    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                        <div className="flex justify-between items-center border-b border-gray-50 pb-4 mb-4">
                            <div className="flex items-center gap-2">
                                <Users size={16} className="text-gray-400" />
                                <h3 className="text-sm font-semibold text-gray-900">My Tasks</h3>
                            </div>
                            <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded">0</span>
                        </div>
                        <div className="text-center py-6 text-sm text-gray-500">
                            No my tasks
                        </div>
                    </div>

                    {/* Overdue Small Card */}
                    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                        <div className="flex justify-between items-center border-b border-gray-50 pb-4 mb-4">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={16} className="text-gray-400" />
                                <h3 className="text-sm font-semibold text-gray-900">Overdue</h3>
                            </div>
                            <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded">0</span>
                        </div>
                        <div className="text-center py-6 text-sm text-gray-500">
                            No overdue
                        </div>
                    </div>

                    {/* In Progress Small Card */}
                    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                        <div className="flex justify-between items-center border-b border-gray-50 pb-4 mb-4">
                            <div className="flex items-center gap-2">
                                <Clock size={16} className="text-gray-400" />
                                <h3 className="text-sm font-semibold text-gray-900">In Progress</h3>
                            </div>
                            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded">0</span>
                        </div>
                        <div className="text-center py-6 text-sm text-gray-500">
                            No in progress
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
