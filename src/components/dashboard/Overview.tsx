import {
    Folder,
    CheckCircle2,
    Users,
    ArrowRight,
    Clock,
    CircleDot,
    Plus,
    Activity,
    Settings,
    LayoutGrid,
} from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { cn, formatTime, formatTimeLong } from '@/lib/utils'
import { STATUS_ICONS } from '@/lib/constants'
import { getCachedStats, getCachedUsers, getCachedRecentTickets, getCachedProjects, getCachedUserTasks, getCachedUpcomingDeadlines, getCachedRecentNotifications, getCachedUserNote } from '@/lib/cache'
import { Suspense, type ReactNode } from 'react'
import { WidgetSkeleton, StatsSkeleton } from './OverviewSkeletons'
import { markAsRead } from '@/app/dashboard/[workspace]/notifications/actions'
import { ScratchpadWidget } from './ScratchpadWidget'
import WidgetErrorBoundary from '@/components/dashboard/WidgetErrorBoundary'

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
        <div className={cn("premium-card rounded-2xl p-6 relative group", className)}>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
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
    workspaceId: string;
    workspaceSlug: string;
    userRole?: string;
}

export default function DashboardOverview({ userId, workspaceId, workspaceSlug, userRole = '' }: DashboardOverviewProps) {
    return (
        <div className="w-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (Primary Overview) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <WidgetErrorBoundary name="Project Overview">
                        <Suspense fallback={<WidgetSkeleton />}>
                            <ProjectOverviewList workspaceId={workspaceId} workspaceSlug={workspaceSlug} />
                        </Suspense>
                    </WidgetErrorBoundary>

                    <WidgetErrorBoundary name="Recent Issues">
                        <Suspense fallback={<WidgetSkeleton />}>
                            <IssueOverviewList workspaceId={workspaceId} workspaceSlug={workspaceSlug} />
                        </Suspense>
                    </WidgetErrorBoundary>
                </div>

                {/* Right Column (Focus Widgets) */}
                <div className="flex flex-col gap-6">
                    <WidgetErrorBoundary name="My Tasks">
                        <Suspense fallback={<WidgetSkeleton rows={2} />}>
                            <MyTasksWidget userId={userId} workspaceId={workspaceId} workspaceSlug={workspaceSlug} />
                        </Suspense>
                    </WidgetErrorBoundary>

                    <WidgetErrorBoundary name="Scratchpad">
                        <Suspense key="scratchpad-suspense" fallback={<WidgetSkeleton rows={3} />}>
                            <ScratchpadServer userId={userId} />
                        </Suspense>
                    </WidgetErrorBoundary>
                </div>
            </div>
        </div>
    )
}

/**
 * ── STATS CARDS ──
 */
interface StatsCardsProps {
    userId?: string;
    workspaceId: string;
}

async function StatsCards({ userId, workspaceId }: StatsCardsProps) {
    if (userId) {
        // Fetch personalized stats
        const { getCachedUserStatsV2 } = await import('@/lib/cache');
        const userStats = await getCachedUserStatsV2(userId, workspaceId);
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard label="My Urgent Issues" value={userStats.urgentIssuesCount} icon={CircleDot} color="text-red-500" bg="bg-red-50" delay="delay-0" />
                <StatCard label="Tickets Completed" value={userStats.completedTicketsCount} icon={CheckCircle2} color="text-green-500" bg="bg-green-50" delay="delay-75" />
                <StatCard label="In Progress" value={userStats.inProgressTicketsCount} icon={Clock} color="text-indigo-600" bg="bg-indigo-50" delay="delay-150" />
                <StatCard label="Projects Assigned" value={userStats.projectsAssignedCount} icon={Folder} color="text-purple-600" bg="bg-purple-50" delay="delay-300" />
            </div>
        );
    }

    // Default to workspace stats
    const stats = await getCachedStats(workspaceId);

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
/**
 * ── WIDGET: PROJECT LIST ──
 */
async function ProjectOverviewList({ workspaceId, workspaceSlug }: { workspaceId: string, workspaceSlug: string }) {
    const [stats, users] = await Promise.all([
        getCachedStats(workspaceId),
        getCachedUsers(workspaceId)
    ]);
    const recentProjects = stats.recentProjects || [];
    const projectStats = stats.projectStats || {};
    const userMap = new Map(users.map(u => [u.id, u]));

    return (
        <Widget title="Project Overview" href={`/dashboard/${workspaceSlug}/projects`}>
            {recentProjects.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center min-h-[200px] text-center">
                    <div className="bg-gray-50 p-4 rounded-full text-gray-300 mb-4 animate-bounce">
                        <Folder size={32} />
                    </div>
                    <h3 className="text-gray-900 font-medium">Ready to start?</h3>
                </div>
            ) : (
                <div className="divide-y divide-gray-100/60 -mx-6 -mb-6">
                    {recentProjects.map((project: any) => {
                        const pStat = projectStats[project.id] || { total: 0, done: 0 };
                        const lead = userMap.get(project.lead_id);

                        return (
                            <Link
                                key={project.id}
                                href={`/dashboard/${workspaceSlug}/projects/${project.id}`}
                                className="px-6 py-5 hover:bg-slate-50/80 transition-all flex items-center justify-between group/project border-b border-gray-100 last:border-0"
                            >
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <div className="w-8 h-8 bg-indigo-50 flex items-center justify-center rounded-lg border border-indigo-100 group-hover/project:bg-indigo-100 group-hover/project:scale-105 transition-all shrink-0">
                                        <Folder size={14} className="text-indigo-600" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <h3 className="text-[13px] font-bold text-slate-800 group-hover/project:text-indigo-600 transition-colors tracking-tight truncate">
                                            {project.project_name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                {pStat.done}/{pStat.total} tasks
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-slate-200" />
                                            <div className="flex items-center gap-1.5">
                                                <div className={cn("w-1.5 h-1.5 rounded-full",
                                                    project.status === 'done' ? 'bg-green-500' :
                                                    project.status === 'in_progress' ? 'bg-indigo-500' :
                                                    project.status === 'cancelled' ? 'bg-red-500' :
                                                    'bg-orange-500'
                                                )} />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                    {project.status ? project.status.replace('_', ' ') : 'backlog'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    {lead && (
                                        <UserAvatar 
                                            name={lead.name} 
                                            avatarUrl={lead.avatar_url} 
                                            size="xs" 
                                        />
                                    )}
                                    <span className="text-[10px] font-bold text-slate-300 uppercase w-12 text-right">
                                        {new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
async function IssueOverviewList({ workspaceId, workspaceSlug }: { workspaceId: string, workspaceSlug: string }) {
    const recentTickets = await getCachedRecentTickets(5, workspaceId);

    const renderPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return (
                    <div className="flex gap-0.5 items-end h-3">
                        <div className="w-1 h-3 bg-red-500 rounded-sm"></div>
                        <div className="w-1 h-3 bg-red-500 rounded-sm"></div>
                        <div className="w-1 h-3 bg-red-500 rounded-sm"></div>
                    </div>
                );
            case 'high':
                return (
                    <div className="flex gap-0.5 items-end h-3">
                        <div className="w-1 h-2 bg-red-400 rounded-sm"></div>
                        <div className="w-1 h-2.5 bg-red-400 rounded-sm"></div>
                        <div className="w-1 h-3 bg-red-400 rounded-sm"></div>
                    </div>
                );
            case 'medium':
                return (
                    <div className="flex gap-0.5 items-end h-3">
                        <div className="w-1 h-1.5 bg-yellow-400 rounded-sm"></div>
                        <div className="w-1 h-2.5 bg-yellow-400 rounded-sm"></div>
                        <div className="w-1 h-3 bg-yellow-100 rounded-sm"></div>
                    </div>
                );
            case 'low':
                return (
                    <div className="flex gap-0.5 items-end h-3">
                        <div className="w-1 h-1.5 bg-indigo-400 rounded-sm"></div>
                        <div className="w-1 h-3 bg-indigo-100 rounded-sm"></div>
                        <div className="w-1 h-3 bg-indigo-100 rounded-sm"></div>
                    </div>
                );
            default:
                return <div className="w-4 h-0.5 bg-slate-200 rounded-full"></div>;
        }
    };
    
    return (
        <Widget title="Recent Issues" href={`/dashboard/${workspaceSlug}/issues`}>
            {recentTickets.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center min-h-[200px] text-center text-gray-400 font-medium italic">
                    <CircleDot size={32} className="mb-4 opacity-20" />
                    No urgent issues detected
                </div>
            ) : (
                <div className="divide-y divide-gray-100/60 -mx-6 -mb-6">
                    {recentTickets.map((ticket: any) => {
                        const statusData = STATUS_ICONS[ticket.status] || STATUS_ICONS['to_do'];
                        const statusColor = statusData.color;

                        return (
                            <Link
                                key={ticket.id}
                                href={`/dashboard/${workspaceSlug}/issues/${ticket.id}`}
                                className="px-5 py-4 hover:bg-gray-50 transition-all flex items-center justify-between group/ticket border-b border-gray-50 last:border-0"
                            >
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <div className="w-8 shrink-0 flex justify-center opacity-60 group-hover/ticket:opacity-100 transition-opacity">
                                        {renderPriorityIcon(ticket.priority)}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter shrink-0">
                                                {ticket.projects?.project_name?.substring(0, 3).toUpperCase() || 'KAP'}-{ticket.id.substring(0, 2).toUpperCase()}
                                            </span>
                                            <h3 className="text-sm font-bold text-slate-800 group-hover/ticket:text-indigo-600 transition-colors truncate tracking-tight">
                                                {ticket.title}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusColor.replace('text-', 'bg-'))} />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                {ticket.status.replace('_', ' ')}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-slate-200" />
                                            <div className="flex items-center gap-1.5 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100/50">
                                                <LayoutGrid size={10} className="text-slate-400" />
                                                <span className="text-[9px] font-bold text-slate-500 uppercase truncate max-w-[120px]">
                                                    {ticket.projects?.project_name || 'No Project'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 ml-4">
                                    <UserAvatar 
                                        name={ticket.assignees?.name || 'Unassigned'} 
                                        avatarUrl={ticket.assignees?.avatar_url} 
                                        size="xs" 
                                    />
                                    <span className="text-[10px] font-bold text-slate-300 uppercase w-12 text-right">
                                        {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
async function MyTasksWidget({ userId, workspaceId, workspaceSlug }: { userId: string, workspaceId: string, workspaceSlug: string }) {
    const tasks = await getCachedUserTasks(userId, workspaceId);

    return (
        <Widget title="My Tasks" count={tasks.length} href={`/dashboard/${workspaceSlug}/my-tasks`}>
            {tasks.length > 0 ? (
                <div className="max-h-[180px] overflow-y-auto pr-3 custom-scrollbar transition-all duration-200">
                    <div className="flex flex-col gap-4">
                        {tasks.map((task: any) => (
                            <Link key={task.id} href={`/dashboard/${workspaceSlug}/issues/${task.id}`} className="group/task cursor-pointer">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-700 truncate pr-2 group-hover/task:text-indigo-600 transition-colors">
                                        {task.title}
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-300 uppercase shrink-0">
                                        {formatTime(task.created_at)}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
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
 * ── WIDGET: SCRATCHPAD SERVER WRAPPER ──
 */
async function ScratchpadServer({ userId }: { userId: string }) {
    const initialNote = await getCachedUserNote(userId);
    return <ScratchpadWidget userId={userId} initialContent={initialNote} />;
}

export { StatsCards };
