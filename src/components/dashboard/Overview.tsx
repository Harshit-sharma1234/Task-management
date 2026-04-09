import {
    Folder,
    CheckCircle2,
    Users,
    ArrowRight,
    Clock,
    CircleDot,
    Plus,
} from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { cn, formatTime } from '@/lib/utils'
import { STATUS_ICONS } from '@/lib/constants'
import { getCachedStats, getCachedUsers, getCachedRecentTickets, getCachedProjects, getCachedUserTasks } from '@/lib/cache'
import { Suspense, type ReactNode } from 'react'
import { WidgetSkeleton, StatsSkeleton } from './OverviewSkeletons'

// Lazy load interactive elements
const CreateProjectButton = dynamic(() => import('@/components/dashboard/CreateProjectButton').then(mod => mod.CreateProjectButton), { 
    loading: () => <div className="h-10 w-32 bg-gray-100 animate-pulse rounded-md" />
})

/**
 * ── DX IMPROVEMENT: WIDGET CONTAINER ──
 * Consolidates the card shell, title, and "View All" link pattern.
 */
interface WidgetProps {
    title: string;
    href?: string;
    count?: number;
    children: ReactNode;
    className?: string;
}

function Widget({ title, href, count, children, className }: WidgetProps) {
    return (
        <div className={cn("bg-white border border-gray-100 rounded-xl p-5 shadow-sm transition-all duration-300 hover:shadow-md", className)}>
            <div className="flex justify-between items-center border-b border-gray-50 pb-4 mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                    {count !== undefined && (
                        <span className="bg-gray-50 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-gray-100">
                            {count}
                        </span>
                    )}
                </div>
                {href && (
                    <Link href={href} className="text-xs text-gray-400 hover:text-gray-900 flex items-center gap-1 group transition-colors font-medium">
                        View all <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                )}
            </div>
            <div className="animate-slide-up">
                {children}
            </div>
        </div>
    )
}

/**
 * ── MAIN DASHBOARD OVERVIEW ──
 */
interface DashboardOverviewProps {
    userId: string;
}

export default function DashboardOverview({ userId }: DashboardOverviewProps) {
    return (
        <div className="w-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (Primary Overview) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <Suspense fallback={<WidgetSkeleton />}>
                        <ProjectOverviewList />
                    </Suspense>
                    <Suspense fallback={<WidgetSkeleton />}>
                        <IssueOverviewList />
                    </Suspense>
                </div>

                {/* Right Column (Focus Widgets) */}
                <div className="flex flex-col gap-4">
                    <Suspense fallback={<WidgetSkeleton rows={2} />}>
                        <MyTasksWidget userId={userId} />
                    </Suspense>
                    <Suspense fallback={<WidgetSkeleton rows={2} />}>
                        <InProgressWidget />
                    </Suspense>
                </div>
            </div>
        </div>
    )
}

/**
 * ── STATS CARDS ──
 */
async function StatsCards() {
    const stats = await getCachedStats();
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Projects" value={stats.projectsCount} icon={Folder} color="text-indigo-600" bg="bg-indigo-50" delay="delay-0" />
            <StatCard label="Completed" value={stats.completedProjectsCount} icon={CheckCircle2} color="text-green-500" bg="bg-green-50" delay="delay-75" />
            <StatCard label="In Progress" value={stats.inProgressProjectsCount} icon={Clock} color="text-indigo-600" bg="bg-indigo-50" delay="delay-150" />
            <StatCard label="Recent Issues" value={stats.tasksCount || 0} icon={CircleDot} color="text-purple-600" bg="bg-purple-50" delay="delay-300" />
        </div>
    )
}

function StatCard({ label, value, icon: Icon, color, bg, delay }: any) {
    return (
        <div className={cn(
            "bg-white border border-gray-100 rounded-xl p-5 shadow-sm transition-all duration-300",
            "hover:shadow-md hover:-translate-y-0.5 group animate-slide-up",
            delay
        )}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-gray-500 font-medium">{label}</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2 tracking-tight">{value}</h3>
                </div>
                <div className={cn("p-2.5 rounded-lg transition-transform duration-300 group-hover:scale-110", bg, color)}>
                    <Icon size={20} />
                </div>
            </div>
        </div>
    )
}

/**
 * ── WIDGET: PROJECT LIST ──
 */
async function ProjectOverviewList() {
    const stats = await getCachedStats();
    const recentProjects = stats.recentProjects || [];

    return (
        <Widget title="Project Overview" href="/dashboard/projects">
            {recentProjects.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center min-h-[200px] text-center">
                    <div className="bg-gray-50 p-4 rounded-full text-gray-300 mb-4 animate-bounce">
                        <Folder size={32} />
                    </div>
                    <h3 className="text-gray-900 font-medium mb-4">Ready to start?</h3>
                    <CreateProjectButton variant="empty-state" />
                </div>
            ) : (
                <div className="divide-y divide-gray-50 -mx-5 -mb-5">
                    {recentProjects.map((project: any) => (
                        <Link 
                            key={project.id} 
                            href={`/dashboard/projects/${project.id}`}
                            className="px-5 py-4 hover:bg-gray-50 transition-all flex items-center justify-between group/project border-b border-gray-50 last:border-0"
                        >
                            <div className="flex items-center gap-4">
                                <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-600 group-hover/project:bg-indigo-100 group-hover/project:scale-105 transition-all">
                                    <Folder size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 group-hover/project:text-indigo-600 transition-colors uppercase tracking-tight">{project.project_name}</h3>
                                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{project.description || 'No description'}</p>
                                </div>
                            </div>
                            <div className="text-right flex items-center gap-2">
                                <div className={cn("w-1.5 h-1.5 rounded-full",
                                    project.status === 'done' ? 'bg-green-500' :
                                    project.status === 'in_progress' ? 'bg-indigo-500' :
                                    project.status === 'cancelled' ? 'bg-red-500' :
                                    'bg-orange-500'
                                )} />
                                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                                    {project.status ? project.status.replace('_', ' ') : 'backlog'}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </Widget>
    )
}

/**
 * ── WIDGET: ISSUE LIST ──
 */
async function IssueOverviewList() {
    const recentTickets = await getCachedRecentTickets(5);
    
    return (
        <Widget title="Recent Issues" href="/dashboard/issues">
            {recentTickets.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center min-h-[200px] text-center text-gray-400 font-medium italic">
                    <CircleDot size={32} className="mb-4 opacity-20" />
                    No urgent issues detected
                </div>
            ) : (
                <div className="divide-y divide-gray-50 -mx-5 -mb-5">
                    {recentTickets.map((ticket: any) => {
                        const statusData = STATUS_ICONS[ticket.status] || STATUS_ICONS['to_do'];
                        const StatusIcon = statusData.icon;
                        const statusColor = statusData.color;

                        return (
                            <Link 
                                key={ticket.id} 
                                href={`/dashboard/issues/${ticket.id}`}
                                className="px-5 py-4 hover:bg-gray-50 transition-all flex items-center justify-between group/ticket border-b border-gray-50 last:border-0"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className={cn("p-2 rounded-lg transition-all group-hover/ticket:scale-105", statusColor.replace('text-', 'bg-') + "/10", statusColor)}>
                                        <StatusIcon size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-semibold text-gray-900 group-hover/ticket:text-indigo-600 transition-colors uppercase tracking-tight truncate">
                                            {ticket.title}
                                        </h3>
                                        <p className="text-[10px] text-gray-400 mt-0.5 truncate font-bold opacity-60 uppercase tracking-widest">
                                            {ticket.projects?.project_name || 'No Project'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-4 shrink-0">
                                    <div className="hidden sm:block px-2 py-0.5 bg-gray-50 border border-gray-100 rounded text-[9px] font-bold text-gray-400 uppercase">
                                        {ticket.status.replace('_', ' ')}
                                    </div>
                                    <span className="text-[10px] font-semibold text-gray-300 uppercase tabular-nums">
                                        {formatTime(ticket.created_at)}
                                    </span>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}
        </Widget>
    )
}

/**
 * ── WIDGET: MY TASKS ──
 */
async function MyTasksWidget({ userId }: { userId: string }) {
    const tasks = await getCachedUserTasks(userId);
    
    return (
        <Widget title="My Tasks" count={tasks.length}>
            {tasks.length > 0 ? (
                <div className="flex flex-col gap-4">
                    {tasks.slice(0, 3).map((task: any) => (
                        <div key={task.id} className="group/task cursor-pointer">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-700 truncate pr-2 group-hover/task:text-indigo-600 transition-colors">
                                    {task.title}
                                </span>
                                <span className="text-[10px] font-bold text-gray-300 uppercase shrink-0">
                                    {formatTime(task.created_at)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-6 text-[10px] text-gray-300 font-bold uppercase tracking-widest">Inbox Zero</div>
            )}
        </Widget>
    )
}

/**
 * ── WIDGET: IN PROGRESS ──
 */
async function InProgressWidget() {
    const projects = await getCachedProjects();
    const inProgress = projects.filter((p: any) => p.status === 'in_progress');

    return (
        <Widget title="In Progress" count={inProgress.length}>
            {inProgress.length > 0 ? (
                <div className="flex flex-col gap-4">
                    {inProgress.slice(0, 3).map((project: any) => (
                        <div key={project.id} className="group/prog cursor-pointer">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-700 truncate pr-2 group-hover/prog:text-indigo-600 transition-colors uppercase tracking-tight">
                                    {project.project_name}
                                </span>
                                <span className="text-[10px] font-bold text-gray-300 uppercase shrink-0">
                                    {formatTime(project.created_at)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-6 text-[10px] text-gray-300 font-bold uppercase tracking-widest">None active</div>
            )}
        </Widget>
    )
}

export { StatsCards };
