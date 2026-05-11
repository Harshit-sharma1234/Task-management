'use client';

import { useState, useMemo, memo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Folder, Search, Trash2, Loader2, Filter, User as UserIcon, ChevronDown, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter, useParams, useSearchParams, usePathname } from 'next/navigation';
import { deleteProject, updateProjectTargetDate } from '@/app/dashboard/actions';
import { AppRole } from '@/lib/roles';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ConfirmModal } from '../ui/ConfirmModal';
import { toast } from 'sonner';
import { useModalStore } from '@/lib/store/modal';
import { useSettingsStore } from '@/lib/store/settings';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { twMerge } from 'tailwind-merge';

// Global Shortcut & Modal State Management
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
    workspace_id?: string;
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

/**
 * Memoized row component to prevent re-renders of the entire 
 * project list when searching or filtering.
 */
const ProjectRow = memo(({
    project,
    users,
    isLast,
    userRole,
    onUpdateDate,
    workspaceId
}: {
    project: Project;
    users: User[];
    isLast: boolean;
    userRole: AppRole | null;
    onUpdateDate: (projectId: string, dateStr: string | null) => Promise<{ error?: string }>;
    workspaceId?: string;
}) => {
    const router = useRouter();
    const params = useParams();
    const workspaceSlug = params?.workspace as string;
    const [isDeleting, setIsDeleting] = useState(false);
    const [isInteractive, setIsInteractive] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const { setActiveProject, setActiveTicket } = useModalStore();

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

    return (
        <div
            className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_120px_auto] md:grid-cols-[1fr_100px_140px_140px_140px_48px] items-center py-2 hover:bg-gray-50/50 transition-colors group text-sm relative hover:z-20 focus-within:z-20 border-b border-gray-100"
            onMouseEnter={() => setIsInteractive(true)}
            onFocus={() => setIsInteractive(true)}
        >
            {/* Name */}
            <div className="flex items-center gap-2 sm:gap-3 pl-4 sm:pl-5 min-w-0">
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
                <PrioritySelector projectId={project.id} currentPriority={project.priority} />
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
                <TargetDateSelector 
                    projectId={project.id} 
                    currentTargetDate={project.start_date || null} 
                    align="right" 
                    onUpdate={onUpdateDate}
                />
            </div>

            {/* Status */}
            <div className="flex items-center justify-end pr-3 sm:pr-5 text-gray-500 gap-2 relative z-10">
                <div className={`w-2 h-2 rounded-full ${project.status === 'done' ? 'bg-green-500' :
                    project.status === 'in_progress' ? 'bg-indigo-500' :
                        project.status === 'cancelled' ? 'bg-red-500' :
                            'bg-orange-500'
                    }`}></div>
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-tight">
                    {project.status ? project.status.replace('_', ' ') : 'backlog'}
                </span>
            </div>
            {/* Actions (Hidden on mobile unless group-hover, maybe?) */}
            <div className="hidden md:flex items-center justify-end pr-5 relative z-10">
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
            </div>

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
    );
});

ProjectRow.displayName = 'ProjectRow';

export function ProjectList({ projects, users, userMap, userRole, workspaceId }: ProjectListProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [searchTerm, setSearchTerm] = useState('');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    
    const filterParam = searchParams.get('filter');
    const [leadFilter, setLeadFilter] = useState<string>(filterParam === 'assigned' ? (useSettingsStore.getState().user?.id || 'all') : 'all');
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [filterSearch, setFilterSearch] = useState('');

    const { user } = useSettingsStore();

    const updateFilter = (name: string, value: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === 'all' || !value) {
            params.delete(name);
        } else {
            params.set(name, value);
        }
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

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
            list = list.filter(p => {
                if (statusFilter === 'backlog') return p.status === null || p.status === 'backlog';
                return p.status === statusFilter;
            });
        }

        if (leadFilter !== 'all') {
            list = list.filter(p => p.lead_id === leadFilter);
        }

        return list;
    }, [projects, searchTerm, priorityFilter, statusFilter, leadFilter, userMap]);

    const handleUpdateDate = useCallback(async (projectId: string, dateStr: string | null) => {
        return await updateProjectTargetDate(projectId, dateStr);
    }, []);

    const rowVirtualizer = useVirtualizer({
        count: filteredProjects.length,
        getScrollElement: () => listScrollRef.current || null,
        estimateSize: () => 50,
        overscan: 8,
    });

    return (
        <div className="flex flex-col h-full w-full">
            {/* Header Section (Search & Create) */}
            <header className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white shrink-0">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">All Projects</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage and view all active workspaces</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search proj.."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 w-[150px] sm:w-64 bg-gray-50/50 transition-all focus:bg-white focus:shadow-sm"
                        />
                    </div>
                    <CreateProjectButton variant="header" workspaceId={workspaceId} />
                </div>
            </header>

            {/* Premium Unified Filters Row */}
            <div className="px-8 py-3 border-b border-gray-100 bg-white flex items-center justify-between shrink-0 shadow-sm z-30">
                <div className="flex items-center gap-3">
                    {/* Unified Filter Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                            className={twMerge(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-tight transition-all duration-200",
                                (statusFilter !== 'all' || priorityFilter !== 'all' || leadFilter !== 'all')
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                            )}
                        >
                            <Filter size={14} className={statusFilter !== 'all' || priorityFilter !== 'all' || leadFilter !== 'all' ? "text-indigo-600" : "text-gray-400"} />
                            <span>Filter</span>
                            {(statusFilter !== 'all' || priorityFilter !== 'all' || leadFilter !== 'all') && (
                                <span className="flex items-center justify-center min-w-[16px] h-4 bg-indigo-600 text-white text-[9px] rounded-full px-1">
                                    {[statusFilter !== 'all', priorityFilter !== 'all', leadFilter !== 'all'].filter(Boolean).length}
                                </span>
                            )}
                            <ChevronDown size={14} className={twMerge("transition-transform", isFilterMenuOpen && "rotate-180")} />
                        </button>

                        {isFilterMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsFilterMenuOpen(false)} />
                                <div className="absolute left-0 mt-2 w-72 bg-white border border-gray-100 shadow-2xl rounded-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden flex flex-col">
                                    <div className="p-3 border-b border-gray-50 flex items-center gap-2 bg-gray-50/50">
                                        <Search size={14} className="text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Add Filter..."
                                            value={filterSearch}
                                            onChange={(e) => setFilterSearch(e.target.value)}
                                            className="bg-transparent border-none focus:ring-0 text-xs w-full placeholder:text-gray-400 font-medium"
                                        />
                                    </div>

                                    <div className="max-h-[450px] overflow-y-auto p-1.5 scrollbar-thin flex flex-col gap-1">
                                        {/* Status Section */}
                                        {!filterSearch && (
                                            <div className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</div>
                                        )}
                                        {[
                                            { id: 'all', label: 'All Statuses', icon: <Filter size={14} /> },
                                            { id: 'backlog', label: 'Backlog', icon: <div className="w-2 h-2 rounded-full bg-gray-400" /> },
                                            { id: 'to_do', label: 'To Do', icon: <div className="w-2 h-2 rounded-full bg-orange-400" /> },
                                            { id: 'in_progress', label: 'In Progress', icon: <div className="w-2 h-2 rounded-full bg-indigo-500" /> },
                                            { id: 'review', label: 'Review', icon: <div className="w-2 h-2 rounded-full bg-fuchsia-400" /> },
                                            { id: 'in_review', label: 'In Review', icon: <div className="w-2 h-2 rounded-full bg-purple-500" /> },
                                            { id: 'done', label: 'Done', icon: <div className="w-2 h-2 rounded-full bg-green-500" /> },
                                            { id: 'cancelled', label: 'Cancelled', icon: <div className="w-2 h-2 rounded-full bg-red-500" /> },
                                        ].filter(f => f.label.toLowerCase().includes(filterSearch.toLowerCase())).map((f) => (
                                            <button
                                                key={f.id}
                                                onClick={() => {
                                                    setStatusFilter(f.id);
                                                    setIsFilterMenuOpen(false);
                                                }}
                                                className={twMerge(
                                                    "w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium transition-colors",
                                                    statusFilter === f.id ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                                )}
                                            >
                                                <div className="w-5 flex justify-center">{f.icon}</div>
                                                <span>{f.label}</span>
                                                {statusFilter === f.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                                            </button>
                                        ))}

                                        {/* Priority Section */}
                                        {!filterSearch && (
                                            <div className="px-2 py-1.5 mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Priority</div>
                                        )}
                                        {[
                                            { id: 'all', label: 'All Priorities', icon: <Filter size={14} /> },
                                            { id: 'urgent', label: 'Urgent', icon: <div className="flex gap-0.5"><div className="w-1 h-3 bg-red-500 rounded-sm" /><div className="w-1 h-3 bg-red-500 rounded-sm" /><div className="w-1 h-3 bg-red-500 rounded-sm" /></div> },
                                            { id: 'high', label: 'High', icon: <div className="flex gap-0.5"><div className="w-1 h-2 bg-orange-500 rounded-sm" /><div className="w-1 h-2.5 bg-orange-500 rounded-sm" /><div className="w-1 h-3 bg-orange-500 rounded-sm" /></div> },
                                            { id: 'medium', label: 'Medium', icon: <div className="flex gap-0.5"><div className="w-1 h-1.5 bg-indigo-400 rounded-sm" /><div className="w-1 h-2.5 bg-indigo-400 rounded-sm" /><div className="w-1 h-3 bg-gray-200 rounded-sm" /></div> },
                                            { id: 'low', label: 'Low', icon: <div className="flex gap-0.5"><div className="w-1 h-1.5 bg-indigo-400 rounded-sm" /><div className="w-1 h-3 bg-gray-200 rounded-sm" /><div className="w-1 h-3 bg-gray-200 rounded-sm" /></div> },
                                        ].filter(f => f.label.toLowerCase().includes(filterSearch.toLowerCase())).map((f) => (
                                            <button
                                                key={f.id}
                                                onClick={() => {
                                                    setPriorityFilter(f.id);
                                                    setIsFilterMenuOpen(false);
                                                }}
                                                className={twMerge(
                                                    "w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium transition-colors",
                                                    priorityFilter === f.id ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                                )}
                                            >
                                                <div className="w-5 flex justify-center">{f.icon}</div>
                                                <span>{f.label}</span>
                                                {priorityFilter === f.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                                            </button>
                                        ))}

                                        {/* Lead Section */}
                                        {!filterSearch && (
                                            <div className="px-2 py-1.5 mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-t border-gray-50 pt-3">Lead</div>
                                        )}
                                        <button
                                            onClick={() => {
                                                setLeadFilter('all');
                                                setIsFilterMenuOpen(false);
                                            }}
                                            className={twMerge(
                                                "w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium transition-colors",
                                                leadFilter === 'all' ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                            )}
                                        >
                                            <div className="w-5 flex justify-center"><UserIcon size={14} className="text-gray-400" /></div>
                                            <span>All Leads</span>
                                        </button>

                                        {(users || []).filter(u => u.name.toLowerCase().includes(filterSearch.toLowerCase())).map((u) => (
                                            <button
                                                key={u.id}
                                                onClick={() => {
                                                    setLeadFilter(u.id);
                                                    setIsFilterMenuOpen(false);
                                                }}
                                                className={twMerge(
                                                    "w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium transition-colors",
                                                    leadFilter === u.id ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                                )}
                                            >
                                                <div className="w-5 flex justify-center">
                                                    <UserAvatar name={u.name} avatarUrl={u.avatar_url} size="xs" />
                                                </div>
                                                <span className="truncate">{u.name}</span>
                                                {leadFilter === u.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                                            </button>
                                        ))}
                                    </div>

                                    {(statusFilter !== 'all' || priorityFilter !== 'all' || leadFilter !== 'all') && (
                                        <div className="p-2 border-t border-gray-50 bg-gray-50/30">
                                            <button
                                                onClick={() => {
                                                    setStatusFilter('all');
                                                    setPriorityFilter('all');
                                                    setLeadFilter('all');
                                                    setIsFilterMenuOpen(false);
                                                }}
                                                className="w-full py-1.5 text-center text-[10px] font-bold text-gray-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                                            >
                                                Clear All Filters
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Quick Badges */}
                    <div className="flex items-center gap-1.5">
                        {statusFilter !== 'all' && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold border border-gray-200 uppercase tracking-tight">
                                <span>{statusFilter.replace('_', ' ')}</span>
                                <button onClick={() => setStatusFilter('all')} className="hover:text-red-500"><X size={10} /></button>
                            </div>
                        )}
                        {priorityFilter !== 'all' && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-50 text-orange-700 rounded-full text-[10px] font-bold border border-orange-100 uppercase tracking-tight">
                                <span>{priorityFilter}</span>
                                <button onClick={() => setPriorityFilter('all')} className="hover:text-red-500"><X size={10} /></button>
                            </div>
                        )}
                        {leadFilter !== 'all' && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold border border-indigo-100 uppercase tracking-tight">
                                <span>{users.find(u => u.id === leadFilter)?.name || 'User'}</span>
                                <button onClick={() => setLeadFilter('all')} className="hover:text-red-500"><X size={10} /></button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                        {filteredProjects.length} {filteredProjects.length === 1 ? 'Project' : 'Projects'}
                    </span>
                </div>
            </div>

            {/* Main Content Grid */}
            <main ref={listScrollRef} className="flex-1 p-3 sm:p-5 md:p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    {filteredProjects.length === 0 ? (
                        <div className="bg-white border border-gray-100 rounded-xl p-16 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
                            <div className="bg-gray-100 p-5 rounded-full text-gray-400 mb-5">
                                <Folder size={40} />
                            </div>
                            <h3 className="text-lg text-gray-900 font-semibold mb-2">
                                {(searchTerm || priorityFilter !== 'all' || statusFilter !== 'all' || leadFilter !== 'all') ? 'No matching projects' : 'No projects found'}
                            </h3>
                            <p className="text-gray-500 mb-6 text-center max-w-sm">
                                {(searchTerm || priorityFilter !== 'all' || statusFilter !== 'all' || leadFilter !== 'all')
                                    ? `We couldn't find any projects matching your current filters.`
                                    : "You haven't created any projects yet. Start by creating a project to organize your team's tasks."}
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                            {/* List Header */}
                            <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_120px_auto] md:grid-cols-[1fr_100px_140px_140px_140px_48px] items-center border-b border-gray-100 bg-gray-50/50 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                <div className="pl-4 sm:pl-5">Name</div>
                                <div className="hidden md:block">Priority</div>
                                <div className="hidden sm:block">Lead</div>
                                <div className="hidden lg:block text-right pr-5">Start date</div>
                                <div className="text-right pr-3 sm:pr-5">Status</div>
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
                                                onUpdateDate={handleUpdateDate}
                                                workspaceId={workspaceId}
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
