import { createClient } from '@/lib/supabase/server'
import {
    Folder,
    CheckCircle2,
    Users,
    ArrowRight,
    Clock,
    CircleDot,
    Circle,
    CircleEllipsis,
    X,
    SignalHigh,
    SignalMedium,
    SignalLow,
    MoreHorizontal
} from 'lucide-react'
import Link from 'next/link'
import { CreateProjectButton } from '@/components/dashboard/CreateProjectButton'
import { clsx } from 'clsx'
import { getCachedStats, getCachedUsers, getCachedRecentTickets } from '@/lib/cache'

// Status Icon Mapping
const statusIcons: Record<string, any> = {
    'to_do': { label: 'Todo', icon: Circle, color: 'text-gray-400' },
    'in_progress': { label: 'In Progress', icon: CircleEllipsis, color: 'text-yellow-500' },
    'done': { label: 'Done', icon: CheckCircle2, color: 'text-indigo-500' },
    'backlog': { label: 'Backlog', icon: CircleDot, color: 'text-gray-400' },
    'review': { label: 'Review', icon: CircleEllipsis, color: 'text-orange-500' },
    'in_review': { label: 'In Review', icon: CircleEllipsis, color: 'text-orange-600' },
    'cancelled': { label: 'Cancelled', icon: X, color: 'text-red-400' },
};

// Priority Icon Mapping
const priorityIcons: Record<string, any> = {
    'urgent': { label: 'Urgent', icon: SignalHigh, color: 'text-red-600' },
    'high': { label: 'High', icon: SignalHigh, color: 'text-red-500' },
    'medium': { label: 'Medium', icon: SignalMedium, color: 'text-yellow-500' },
    'low': { label: 'Low', icon: SignalLow, color: 'text-indigo-500' },
    'no_priority': { label: 'No priority', icon: MoreHorizontal, color: 'text-gray-400' },
};

export default async function DashboardOverview() {
    const supabase = await createClient()
    
    // Fetch user and cached data in parallel
    const [userResponse, users, stats, tickets] = await Promise.all([
        supabase.auth.getUser(),
        getCachedUsers(),
        getCachedStats(),
        getCachedRecentTickets(10)
    ]);

    const { data: userData } = userResponse;
    const currentUserId = userData?.user?.id;
    const userName = userData?.user?.user_metadata?.full_name || 'Khushi Tailor'
    
    // Use data from cached stats
    const projects = stats.recentProjects || []
    
    const totalProjectsCount = stats.projectsCount
    const completedProjectsCount = stats.completedProjectsCount
    const inProgressProjectsCount = stats.inProgressProjectsCount
    const myTasksCount = tickets.filter((t: any) => t.assignee_id === currentUserId).length

    return (
        <div className="p-8 w-full">
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
                            <h3 className="text-3xl font-bold text-gray-900 mt-2">{totalProjectsCount}</h3>
                        </div>
                        <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-600">
                            <Folder size={20} />
                        </div>
                    </div>
                </div>

                {/* Completed Projects */}
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Completed Projects</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-2">{completedProjectsCount}</h3>
                        </div>
                        <div className="bg-green-50 p-2.5 rounded-lg text-green-500">
                            <CheckCircle2 size={20} />
                        </div>
                    </div>
                </div>

                {/* My Tasks */}
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">My Tasks</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-2">{myTasksCount}</h3>
                        </div>
                        <div className="bg-purple-50 p-2.5 rounded-lg text-purple-500">
                            <Users size={20} />
                        </div>
                    </div>
                </div>

                {/* In Progress */}
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">In Progress</p>
                            <h3 className="text-3xl font-bold text-gray-900 mt-2">{inProgressProjectsCount}</h3>
                        </div>
                        <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-600">
                            <Clock size={20} />
                        </div>
                    </div>
                </div>
            </div>


            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (Project Overview & Issue Overview) */}
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
                            <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[180px]">
                                <div className="grid grid-cols-1 divide-y divide-gray-100 flex-1">
                                    {projects.slice(0, 3).map((project: any) => (
                                        <div key={project.id} className="p-5 hover:bg-gray-50 transition-colors flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
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
                                                    project.status === 'in_progress' ? 'bg-indigo-500' :
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

                    {/* Issue Overview */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-base font-semibold text-gray-900">Issue Overview</h2>
                            <Link href="/dashboard/issues" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 group">
                                View all <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </div>

                        {tickets.length === 0 ? (
                            <div className="bg-white border border-gray-100 rounded-xl p-12 shadow-sm flex flex-col items-center justify-center min-h-[320px]">
                                <div className="bg-gray-100 p-4 rounded-full text-gray-400 mb-4">
                                    <CircleDot size={32} />
                                </div>
                                <h3 className="text-gray-900 font-medium mb-4">No issues yet</h3>
                            </div>
                        ) : (
                            <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[180px]">
                                <div className="grid grid-cols-1 divide-y divide-gray-100 flex-1">
                                    {tickets.slice(0, 3).map((ticket: any) => {
                                        const statusData = statusIcons[ticket.status] || statusIcons['to_do']
                                        const StatusIcon = statusData.icon
                                        const statusColor = statusData.color

                                        return (
                                            <div key={ticket.id} className="p-5 hover:bg-gray-50 transition-colors flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={clsx("p-2 rounded-lg", statusColor.replace('text-', 'bg-') + "/10", statusColor)}>
                                                        <StatusIcon size={20} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-gray-900">{ticket.title}</h3>
                                                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{ticket.projects?.project_name || 'No Project'}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right flex items-center gap-4">
                                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                                                        {ticket.status.replace('_', ' ')}
                                                    </div>
                                                    <span className="text-[10px] font-medium text-gray-400 shrink-0">
                                                        {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column (Task Statuses) */}
                <div className="flex flex-col gap-4">
                    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                        <div className="flex justify-between items-center border-b border-gray-50 pb-4 mb-4">
                            <div className="flex items-center gap-2">
                                <Users size={16} className="text-gray-400" />
                                <h3 className="text-sm font-semibold text-gray-900">My Tasks</h3>
                            </div>
                            <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded">{myTasksCount}</span>
                        </div>
                        {myTasksCount > 0 ? (
                            <div className="flex flex-col gap-3">
                                {tickets
                                    .filter((t: any) => t.assignee_id === currentUserId)
                                    .slice(0, 3)
                                    .map((task: any) => (
                                        <div key={task.id} className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium text-gray-900 truncate pr-2">{task.title}</span>
                                                <span className="text-[10px] text-gray-400 shrink-0">
                                                    {new Date(task.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-sm text-gray-500">
                                No my tasks
                            </div>
                        )}
                    </div>

                    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                        <div className="flex justify-between items-center border-b border-gray-50 pb-4 mb-4">
                            <div className="flex items-center gap-2">
                                <Clock size={16} className="text-gray-400" />
                                <h3 className="text-sm font-semibold text-gray-900">In Progress</h3>
                            </div>
                            <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded">{inProgressProjectsCount}</span>
                        </div>
                        {inProgressProjectsCount > 0 ? (
                            <div className="flex flex-col gap-3">
                                {projects
                                    .filter((p: any) => p.status === 'in_progress')
                                    .slice(0, 3)
                                    .map((project: any) => (
                                        <div key={project.id} className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium text-gray-900 truncate pr-2">{project.project_name}</span>
                                                <span className="text-[10px] text-gray-400 shrink-0">
                                                    {new Date(project.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-sm text-gray-500">
                                No projects in progress
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
