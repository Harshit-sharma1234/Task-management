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
import { cn, formatTime, formatTimeLong } from '@/lib/utils'
import { STATUS_ICONS } from '@/lib/constants'
import { getCachedStats, getCachedUsers, getCachedRecentTickets, getCachedProjects, getCachedUserTasks, getCachedUpcomingDeadlines, getCachedRecentNotifications } from '@/lib/cache'
import { Suspense, type ReactNode } from 'react'
import { WidgetSkeleton, StatsSkeleton } from './OverviewSkeletons'
import { markAsRead } from '@/app/dashboard/notifications/actions'

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
        <div className={cn("premium-card rounded-2xl p-6 relative overflow-hidden group", className)}>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2.5">
                        <h3 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h3>
                        {count !== undefined && (
                            <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200/50">
                                {count}
                            </span>
                        )}
                    </div>
                    {href && (
                        <Link href={href} className="text-xs text-slate-400 hover:text-indigo-600 flex items-center gap-1 group/link transition-all font-semibold">
                            View all <ArrowRight size={12} className="group-hover/link:translate-x-0.5 transition-transform" />
                        </Link>
                    )}
                </div>
                <div className="animate-slide-up">
                    {children}
                </div>
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
                <div className="flex flex-col gap-6">
                    <Suspense fallback={<WidgetSkeleton rows={2} />}>
                        <MyTasksWidget userId={userId} />
                    </Suspense>
                    <Suspense fallback={<WidgetSkeleton rows={3} />}>
                        <UpcomingDeadlinesWidget />
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
            <StatCard label="Urgent Issues" value={stats.urgentIssuesCount} icon={CircleDot} color="text-red-500" bg="bg-red-50" delay="delay-0" />
            <StatCard label="Completed" value={stats.completedProjectsCount} icon={CheckCircle2} color="text-green-500" bg="bg-green-50" delay="delay-75" />
            <StatCard label="In Progress" value={stats.inProgressProjectsCount} icon={Clock} color="text-indigo-600" bg="bg-indigo-50" delay="delay-150" />
            <StatCard label="Total Tickets" value={stats.tasksCount || 0} icon={Folder} color="text-purple-600" bg="bg-purple-50" delay="delay-300" />
        </div>
    )
}

function StatCard({ label, value, icon: Icon, color, bg, delay }: any) {
    return (
        <div className={cn(
            "premium-card rounded-2xl p-6 group animate-slide-up relative overflow-hidden",
            delay
        )}>
            <div className={cn("absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-[0.03] transition-transform duration-700 group-hover:scale-150", bg)} />
            <div className="flex justify-between items-start relative z-10">
                <div>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">{label}</p>
                    <h3 className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
                        {value}
                    </h3>
                </div>
                <div className={cn("p-3 rounded-xl transition-all duration-500 shadow-sm ring-1 ring-black/5 group-hover:scale-110 group-hover:rotate-3", bg, color)}>
                    <Icon size={20} strokeWidth={2.5} />
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
    const projectStats = stats.projectStats || {};

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
                <div className="divide-y divide-gray-50 -mx-6 -mb-6">
                    {recentProjects.map((project: any) => {
                        const pStat = projectStats[project.id] || { total: 0, done: 0 };
                        const progress = pStat.total > 0 ? Math.round((pStat.done / pStat.total) * 100) : 0;

                        return (
                            <Link 
                                key={project.id} 
                                href={`/dashboard/projects/${project.id}`}
                                className="px-6 py-5 hover:bg-slate-50/80 transition-all flex items-center justify-between group/project border-b border-gray-100 last:border-0"
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600 group-hover/project:bg-indigo-100 group-hover/project:scale-105 transition-all shadow-sm ring-1 ring-indigo-100/50">
                                        <Folder size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-bold text-slate-800 group-hover/project:text-indigo-600 transition-colors tracking-tight">{project.project_name}</h3>
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                                {pStat.done}/{pStat.total} tasks
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-2">
                                    <div className={cn("w-1.5 h-1.5 rounded-full",
                                        project.status === 'done' ? 'bg-green-500' :
                                        project.status === 'in_progress' ? 'bg-indigo-500' :
                                        project.status === 'cancelled' ? 'bg-red-500' :
                                        'bg-orange-500'
                                    )} />
                                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                                        {project.status ? project.status.replace('_', ' ') : 'backlog'}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
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
                                    <span className="text-[10px] font-semibold text-gray-400 capitalize tracking-wide pr-2">
                                        {formatTimeLong(ticket.created_at)}
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
/**
 * ── WIDGET: UPCOMING DEADLINES ──
 */
async function UpcomingDeadlinesWidget() {
    const deadlines = await getCachedUpcomingDeadlines();

    return (
        <Widget title="Upcoming Deadlines">
            {deadlines.length > 0 ? (
                <div className="flex flex-col gap-5">
                    {deadlines.map((item: any) => (
                        <div key={item.id} className="group/item cursor-pointer">
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2 max-w-[70%]">
                                    <div className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse" />
                                    <span className="text-xs font-bold text-slate-700 truncate group-hover/item:text-indigo-600 transition-colors tracking-tight">
                                        {item.project_name || item.title}
                                    </span>
                                </div>
                                <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100/50">
                                    {new Date(item.target_date || item.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8">
                    <div className="inline-flex p-3 bg-slate-50 rounded-full text-slate-300 mb-3">
                        <Clock size={24} />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No imminent deadlines</p>
                </div>
            )}
        </Widget>
    )
}

export { StatsCards };
