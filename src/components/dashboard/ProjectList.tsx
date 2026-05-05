'use client';

import { useState, useMemo, memo, useRef } from 'react';
import Link from 'next/link';
import { Folder, Search, Trash2, Loader2, Filter, User as UserIcon } from 'lucide-react';
import { useSettingsStore } from '@/lib/store/settings';
import dynamic from 'next/dynamic';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { deleteProject } from '@/app/dashboard/actions';
import { AppRole } from '@/lib/roles';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ConfirmModal } from '../ui/ConfirmModal';
import { toast } from 'sonner';

// Heavy components that contain modals/complex logic should be lazy loaded
const PrioritySelector = dynamic(() => import('@/components/dashboard/PrioritySelector').then(mod => mod.PrioritySelector), { ssr: false });
const LeadSelector = dynamic(() => import('@/components/dashboard/LeadSelector').then(mod => mod.LeadSelector), { ssr: false });
const TargetDateSelector = dynamic(() => import('@/components/dashboard/TargetDateSelector').then(mod => mod.TargetDateSelector), { ssr: false });
const CreateProjectButton = dynamic(() => import('@/components/dashboard/CreateProjectButton').then(mod => mod.CreateProjectButton), { ssr: false });

interface Project {
    id: string;
    project_name: string;
    lead_id: string | null;
    priority: string | null;
    status: string | null;
    start_date: string | null;
    lead?: {
        id: string;
        name: string;
        avatar_url?: string | null;
    } | null;
}

interface User {
    id: string;
    name: string;
    email: string;
    avatar_url?: string | null;
}

interface ProjectListProps {
    projects: Project[];
    users: User[];
    userMap: Record<string, string>;
    userRole: AppRole | null;
    workspaceId?: string;
}

import { UserAvatar } from '@/components/ui/UserAvatar';

/**
 * Memoized row component to prevent re-renders of the entire 
 * project list when searching or filtering.
 */
const ProjectRow = memo(({
    project,
    users,
    isLast,
    userRole
}: {
    project: Project;
    users: User[];
    isLast: boolean;
    userRole: AppRole | null;
}) => {
    const router = useRouter();
    const params = useParams();
    const workspaceSlug = params?.workspace as string;
    const [isDeleting, setIsDeleting] = useState(false);
    const [isInteractive, setIsInteractive] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const canDelete = userRole === 'Admin' || userRole === 'Project Manager';

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const result = await deleteProject(project.id);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('Project deleted successfully');
                // Instant Store Update
                const { useGlobalStore } = await import('@/lib/store/global');
                useGlobalStore.getState().removeProject(project.id);
            }
        } catch (err) {
            console.error('Delete error:', err);
            toast.error('An error occurred while deleting the project.');
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const prefetchProject = useMemo(() => {
        const overviewHref = `/dashboard/${workspaceSlug}/projects/${project.id}`;
        const issuesHref = `/dashboard/${workspaceSlug}/projects/${project.id}?tab=issues`;
        return () => {
            router.prefetch(overviewHref);
            router.prefetch(issuesHref);
        };
    }, [project.id, router, workspaceSlug]);

    // Priority Icon logic consistent with PrioritySelector
    const renderPriorityIcon = () => {
        const priority = project.priority;
        if (priority === 'urgent') return (
            <div className="flex gap-0.5 items-end h-3" title="Urgent">
                <div className="w-1 h-3 bg-red-500 rounded-sm"></div>
                <div className="w-1 h-3 bg-red-500 rounded-sm"></div>
                <div className="w-1 h-3 bg-red-500 rounded-sm"></div>
            </div>
        );
        if (priority === 'high') return (
            <div className="flex gap-0.5 items-end h-3" title="High">
                <div className="w-1 h-2 bg-orange-500 rounded-sm"></div>
                <div className="w-1 h-2.5 bg-orange-500 rounded-sm"></div>
                <div className="w-1 h-3 bg-orange-500 rounded-sm"></div>
            </div>
        );
        if (priority === 'medium') return (
            <div className="flex gap-0.5 items-end h-3" title="Medium">
                <div className="w-1 h-1.5 bg-indigo-400 rounded-sm"></div>
                <div className="w-1 h-2.5 bg-indigo-400 rounded-sm"></div>
                <div className="w-1 h-3 bg-gray-200 rounded-sm"></div>
            </div>
        );
        if (priority === 'low') return (
            <div className="flex gap-0.5 items-end h-3" title="Low">
                <div className="w-1 h-1.5 bg-indigo-400 rounded-sm"></div>
                <div className="w-1 h-3 bg-gray-200 rounded-sm"></div>
                <div className="w-1 h-3 bg-gray-200 rounded-sm"></div>
            </div>
        );
        return <div className="text-[10px] text-gray-300 font-bold tracking-tight">---</div>;
    };

    // Resolve lead user: try workspace team list first, fallback to joined data from DB
    const leadUser = users.find(u => u.id === project.lead_id) || project.lead;

    return (
        <div
            className="grid grid-cols-[1fr_100px_140px_140px_140px_48px] items-center py-2 hover:bg-gray-50/50 transition-colors group text-sm relative hover:z-20 focus-within:z-20 border-b border-gray-100"
            onMouseEnter={() => setIsInteractive(true)}
            onFocus={() => setIsInteractive(true)}
        >
            {/* Name */}
            <div className="flex items-center gap-3 pl-5 min-w-0">
                <Folder size={15} className="text-gray-400 group-hover:text-gray-600 shrink-0" />
                <Link
                    href={`/dashboard/${workspaceSlug}/projects/${project.id}`}
                    prefetch={true}
                    onMouseEnter={prefetchProject}
                    onFocus={prefetchProject}
                    className="font-medium text-gray-900 truncate hover:text-indigo-600 transition-colors after:absolute after:inset-0 after:z-0"
                >
                    {project.project_name}
                </Link>
            </div>

            {/* Priority */}
            <div className="hidden md:flex items-center relative z-10 pl-2">
                {isInteractive ? (
                    <PrioritySelector projectId={project.id} currentPriority={project.priority} />
                ) : (
                    <div className="py-1">
                        {renderPriorityIcon()}
                    </div>
                )}
            </div>

            {/* Lead */}
            <div className="hidden sm:flex items-center relative z-10 pl-2">
                {isInteractive ? (
                    <LeadSelector 
                        projectId={project.id} 
                        currentLeadId={project.lead_id} 
                        users={users} 
                        showName={true} 
                        hideAvatar={true} 
                        align="left" 
                        fallbackUser={project.lead}
                    />
                ) : (
                    <div className="py-0.5">
                        {leadUser ? (
                            <span className="text-[11px] font-medium text-gray-700 truncate max-w-[130px]">
                                {leadUser.name}
                            </span>
                        ) : (
                            <span className="text-[11px] font-medium text-gray-400 italic">
                                {project.lead_id ? 'Unknown Lead' : 'Unassigned'}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Target date */}
            <div className="hidden lg:flex items-center justify-end pr-5 relative z-10">
                {isInteractive ? (
                    <TargetDateSelector projectId={project.id} currentTargetDate={project.start_date || null} align="right" />
                ) : (
                    <span className="text-[10px] font-bold uppercase text-gray-400 tracking-tight">
                        {project.start_date
                            ? new Date(project.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : 'No date'}
                    </span>
                )}
            </div>

            {/* Status */}
            <div className="flex items-center justify-end pr-5 text-gray-500 gap-2 relative z-10">
                <div className={`w-2 h-2 rounded-full ${project.status === 'done' ? 'bg-green-500' :
                        project.status === 'in_progress' ? 'bg-indigo-500' :
                            project.status === 'cancelled' ? 'bg-red-500' :
                                'bg-orange-500'
                    }`}></div>
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-tight">
                    {project.status ? project.status.replace('_', ' ') : 'backlog'}
                </span>
            </div>
            {/* Actions */}
            <div className="flex items-center justify-end pr-5 relative z-10">
                {canDelete && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowDeleteModal(true);
                        }}
                        disabled={isDeleting}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        title="Delete project"
                    >
                        {isDeleting ? (
                            <Loader2 size={15} className="animate-spin text-red-500" />
                        ) : (
                            <Trash2 size={15} />
                        )}
                    </button>
                )}

                <ConfirmModal
                    isOpen={showDeleteModal}
                    title="Delete Project"
                    message={`Are you sure you want to delete "${project.project_name}"? This will permanently delete all associated tickets and data.`}
                    confirmLabel={isDeleting ? 'Deleting...' : 'Delete Project'}
                    isDestructive={true}
                    onConfirm={handleDelete}
                    onCancel={() => setShowDeleteModal(false)}
                />
            </div>
        </div>
    );
});

ProjectRow.displayName = 'ProjectRow';
export function ProjectList({ projects, users, userMap, userRole, workspaceId }: ProjectListProps) {
    const searchParams = useSearchParams();
    const filterParam = searchParams.get('filter');

    const [searchTerm, setSearchTerm] = useState('');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [assignedToMe, setAssignedToMe] = useState<boolean>(filterParam === 'assigned');
    const { user } = useSettingsStore();

    // Use projects directly from props (kept in sync by the layout's GlobalDataSync)
    const listScrollRef = useRef<HTMLElement>(null);

    const filteredProjects = useMemo(() => {
        let list = projects;

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            list = list.filter(project =>
                project.project_name.toLowerCase().includes(term) ||
                (project.lead_id && userMap[project.lead_id]?.toLowerCase().includes(term))
            );
        }

        if (priorityFilter !== 'all') {
            list = list.filter(p => p.priority === priorityFilter);
        }

        if (statusFilter !== 'all') {
            list = list.filter(p => p.status === (statusFilter === 'backlog' ? null : statusFilter));
        }

        if (assignedToMe && user?.id) {
            list = list.filter(p => p.lead_id === user.id);
        }

        return list;
    }, [projects, searchTerm, priorityFilter, statusFilter, assignedToMe, user?.id, userMap]);

    const rowVirtualizer = useVirtualizer({
        count: filteredProjects.length,
        getScrollElement: () => listScrollRef.current || null,
        estimateSize: () => 50,
        overscan: 8,
    });

    return (
        <div className="flex flex-col h-full w-full">
            {/* Header Section (Search & Create) */}
            <header className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">All Projects</h1>
                        <p className="text-sm text-gray-500 mt-1">Manage and view all active workspaces</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64 bg-gray-50/50"
                        />
                    </div>
                    <CreateProjectButton variant="header" workspaceId={workspaceId} />
                </div>
            </header>

            {/* Filters Row */}
            <div className="px-8 py-3 border-b border-gray-100 bg-white flex items-center gap-4 shrink-0 overflow-x-auto no-scrollbar shadow-sm">
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    <Filter size={12} />
                    Filters
                </div>
                
                <div className="h-4 w-px bg-gray-200 mx-1"></div>

                <div className="flex items-center gap-2">
                    <select 
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="text-[11px] font-bold uppercase tracking-tight bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer text-gray-600"
                    >
                        <option value="all">All Priorities</option>
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>

                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-[11px] font-bold uppercase tracking-tight bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer text-gray-600"
                    >
                        <option value="all">All Statuses</option>
                        <option value="backlog">Backlog</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                        <option value="cancelled">Cancelled</option>
                    </select>

                    <button
                        onClick={() => setAssignedToMe(!assignedToMe)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-tight transition-all border ${
                            assignedToMe 
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-2 ring-indigo-500/10' 
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                        <UserIcon size={12} />
                        Assigned to me
                    </button>

                    {(priorityFilter !== 'all' || statusFilter !== 'all' || assignedToMe) && (
                        <button 
                            onClick={() => {
                                setPriorityFilter('all');
                                setStatusFilter('all');
                                setAssignedToMe(false);
                            }}
                            className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:text-red-600 transition-colors ml-4 py-1 px-2 hover:bg-red-50 rounded-md"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Grid */}
            <main ref={listScrollRef} className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    {filteredProjects.length === 0 ? (
                        <div className="bg-white border border-gray-100 rounded-xl p-16 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
                            <div className="bg-gray-100 p-5 rounded-full text-gray-400 mb-5">
                                <Folder size={40} />
                            </div>
                            <h3 className="text-lg text-gray-900 font-semibold mb-2">
                                {(searchTerm || priorityFilter !== 'all' || statusFilter !== 'all' || assignedToMe) ? 'No matching projects' : 'No projects found'}
                            </h3>
                            <p className="text-gray-500 mb-6 text-center max-w-sm">
                                {(searchTerm || priorityFilter !== 'all' || statusFilter !== 'all' || assignedToMe)
                                    ? `We couldn't find any projects matching your current filters.`
                                    : "You haven't created any projects yet. Start by creating a project to organize your team's tasks."}
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                            {/* List Header */}
                            <div className="grid grid-cols-[1fr_100px_140px_140px_140px_48px] items-center border-b border-gray-100 bg-gray-50/50 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                <div className="pl-5">Name</div>
                                <div className="hidden md:block">Priority</div>
                                <div className="hidden sm:block">Lead</div>
                                <div className="hidden lg:block text-right pr-5">Start date</div>
                                <div className="text-right pr-5">Status</div>
                            </div>

                            {/* List Body */}
                            <div
                                className="relative bg-white"
                                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                            >
                                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                    const project = filteredProjects[virtualRow.index];
                                    if (!project) return null;

                                    return (
                                        <div
                                            key={project.id}
                                            className="absolute left-0 top-0 w-full focus-within:z-30"
                                            style={{ transform: `translateY(${virtualRow.start}px)` }}
                                        >
                                            <ProjectRow
                                                project={project}
                                                users={users}
                                                isLast={virtualRow.index === filteredProjects.length - 1}
                                                userRole={userRole}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
