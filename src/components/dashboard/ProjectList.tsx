'use client';

import { useState, useMemo, memo } from 'react';
import Link from 'next/link';
import { Folder, Search } from 'lucide-react';
import dynamic from 'next/dynamic';

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
}

/**
 * Memoized row component to prevent re-renders of the entire 
 * project list when searching or filtering.
 */
const ProjectRow = memo(({ 
    project, 
    users, 
    isLast 
}: { 
    project: Project; 
    users: User[]; 
    isLast: boolean;
}) => {
    return (
        <div 
            className="grid grid-cols-[1fr_100px_140px_140px_140px] items-center py-3.5 hover:bg-gray-50/50 transition-colors group text-sm relative hover:z-20 focus-within:z-20 border-b border-gray-100"
        >
            {/* Name */}
            <div className="flex items-center gap-3 pl-5 min-w-0">
                <Folder size={15} className="text-gray-400 group-hover:text-gray-600 shrink-0" />
                <Link 
                    href={`/dashboard/projects/${project.id}`}
                    className="font-medium text-gray-900 truncate hover:text-indigo-600 transition-colors after:absolute after:inset-0 after:z-0"
                >
                    {project.project_name}
                </Link>
            </div>
            
            {/* Priority */}
            <div className="hidden md:flex items-center relative z-10">
                <PrioritySelector projectId={project.id} currentPriority={project.priority} />
            </div>
            
            {/* Lead */}
            <div className="hidden sm:flex items-center gap-2 relative z-10">
                <LeadSelector projectId={project.id} currentLeadId={project.lead_id} users={users} align="left" />
            </div>
            
            {/* Target date */}
            <div className="hidden lg:flex items-center justify-end pr-5 relative z-10">
                <TargetDateSelector projectId={project.id} currentTargetDate={project.start_date || null} align="right" />
            </div>
            
            {/* Status */}
            <div className="flex items-center justify-end pr-5 text-gray-500 gap-2 relative z-10">
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
    );
});

ProjectRow.displayName = 'ProjectRow';

export function ProjectList({ projects, users, userMap }: ProjectListProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProjects = useMemo(() => {
        if (!searchTerm.trim()) return projects;
        
        const term = searchTerm.toLowerCase();
        return projects.filter(project => 
            project.project_name.toLowerCase().includes(term) ||
            (project.lead_id && userMap[project.lead_id]?.toLowerCase().includes(term))
        );
    }, [projects, searchTerm, userMap]);

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
                    <CreateProjectButton variant="header" users={users} />
                </div>
            </header>

            {/* Main Content Grid */}
            <main className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    {filteredProjects.length === 0 ? (
                        <div className="bg-white border border-gray-100 rounded-xl p-16 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
                            <div className="bg-gray-100 p-5 rounded-full text-gray-400 mb-5">
                                <Folder size={40} />
                            </div>
                            <h3 className="text-lg text-gray-900 font-semibold mb-2">
                                {searchTerm ? 'No matching projects' : 'No projects found'}
                            </h3>
                            <p className="text-gray-500 mb-6 text-center max-w-sm">
                                {searchTerm 
                                    ? `We couldn't find any projects matching "${searchTerm}".`
                                    : "You haven't created any projects yet. Start by creating a project to organize your team's tasks."}
                            </p>
                            {!searchTerm && <CreateProjectButton variant="header" users={users} />}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                            {/* List Header */}
                            <div className="grid grid-cols-[1fr_100px_140px_140px_140px] items-center border-b border-gray-100 bg-gray-50/50 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                <div className="pl-5">Name</div>
                                <div className="hidden md:block">Priority</div>
                                <div className="hidden sm:block">Lead</div>
                                <div className="hidden lg:block text-right pr-5">Start date</div>
                                <div className="text-right pr-5">Status</div>
                            </div>

                            {/* List Body */}
                            <div className="bg-white">
                                {filteredProjects.map((project, index) => (
                                    <ProjectRow 
                                        key={project.id} 
                                        project={project} 
                                        users={users} 
                                        isLast={index === filteredProjects.length - 1} 
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
