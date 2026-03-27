import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Folder, Search, ArrowLeft, MoreHorizontal, Calendar, User as UserIcon } from 'lucide-react';
import { CreateProjectButton } from '@/components/dashboard/CreateProjectButton'
import { PrioritySelector } from '@/components/dashboard/PrioritySelector'
import { LeadSelector } from '@/components/dashboard/LeadSelector'
import { TargetDateSelector } from '@/components/dashboard/TargetDateSelector'

export default async function ProjectsPage() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        redirect('/login')
    }

    // Fetch all projects
    const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

    const projects = projectsData || []

    // Fetch users for the Lead dropdown and name mapping
    const { data: usersData } = await supabase
        .from('users')
        .select('id, name')
        
    const users = usersData || []
    
    // Create an efficient dictionary to map lead_id to actual user names
    const userMap = users.reduce((acc, u) => {
        acc[u.id] = u.name
        return acc
    }, {} as Record<string, string>)

    return (
        <div className="flex flex-col h-full w-full bg-[#fbfbfb]">
            {/* Header Section */}
            <header className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 -ml-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                        <ArrowLeft size={18} />
                    </Link>
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
                            className="pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-64 bg-gray-50/50"
                        />
                    </div>
                    <CreateProjectButton variant="header" users={users} />
                </div>
            </header>

            {/* Main Content Grid */}
            <main className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    
                    {projects.length === 0 ? (
                        <div className="bg-white border border-gray-100 rounded-xl p-16 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
                            <div className="bg-gray-100 p-5 rounded-full text-gray-400 mb-5">
                                <Folder size={40} />
                            </div>
                            <h3 className="text-lg text-gray-900 font-semibold mb-2">No projects found</h3>
                            <p className="text-gray-500 mb-6 text-center max-w-sm">
                                You haven't created any projects yet. Start by creating a project to organize your team's tasks.
                            </p>
                            <CreateProjectButton variant="header" users={users} />
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                            {/* List Header */}
                            <div className="flex items-center border-b border-gray-100 bg-gray-50/50 py-3 text-xs font-medium text-gray-500 rounded-t-lg">
                                <div className="flex-1 min-w-[200px] pl-5">Name</div>
                                <div className="w-32 hidden md:block">Health</div>
                                <div className="w-24 hidden md:block">Priority</div>
                                <div className="w-32 hidden sm:block">Lead</div>
                                <div className="w-32 hidden lg:block">Start date</div>
                                <div className="w-24 text-right pr-5">Status</div>
                            </div>

                            {/* List Body */}
                            <div className="divide-y divide-gray-100">
                                {projects.map((project: any) => {
                                    const leadName = project.lead_id && userMap[project.lead_id] ? userMap[project.lead_id] : 'Unassigned'
                                    
                                    // Generate initial avatar from lead name
                                    const initials = leadName !== 'Unassigned' 
                                        ? leadName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                                        : '?'
                                    
                                    // Base color mapping for initials (hash based on name string for consistent colors)
                                    const getBadgeColor = (name: string) => {
                                        if (name === 'Unassigned') return 'bg-gray-200 text-gray-500'
                                        const colors = ['bg-orange-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-pink-500']
                                        let hash = 0
                                        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
                                        return `${colors[Math.abs(hash) % colors.length]} text-white`
                                    }

                                    return (
                                        <div 
                                            key={project.id} 
                                            className="flex items-center py-3.5 hover:bg-gray-50/80 transition-colors group cursor-pointer text-sm"
                                        >
                                            {/* Name */}
                                            <div className="flex-1 min-w-[200px] flex items-center gap-3 pl-5">
                                                <Link 
                                                    href={`/dashboard/projects/${project.id}`}
                                                    className="flex items-center gap-3 group/link hover:underline decoration-gray-400 underline-offset-4"
                                                >
                                                    <Folder size={15} className="text-gray-400 group-hover/link:text-gray-600 shrink-0" />
                                                    <span className="font-medium text-gray-900 truncate">{project.project_name}</span>
                                                </Link>
                                            </div>
                                            
                                            {/* Health */}
                                            <div className="w-32 hidden md:flex items-center gap-2 text-gray-500">
                                                <div className="w-3.5 h-3.5 rounded-full border border-dashed border-gray-300"></div>
                                                <span className="text-xs">No updates</span>
                                            </div>
                                            
                                            {/* Priority */}
                                            <div className="w-24 hidden md:flex items-center">
                                                <PrioritySelector projectId={project.id} currentPriority={project.priority} />
                                            </div>
                                            
                                            {/* Lead */}
                                            <div className="w-32 hidden sm:flex items-center gap-2">
                                                <LeadSelector projectId={project.id} currentLeadId={project.lead_id} users={users} />
                                            </div>
                                            
                                            {/* Target date */}
                                            <div className="w-32 hidden lg:flex items-center gap-2">
                                                <TargetDateSelector projectId={project.id} currentTargetDate={project.start_date || null} />
                                            </div>
                                            
                                            {/* Status */}
                                            <div className="w-24 flex items-center justify-end pr-5 text-gray-500 gap-2">
                                                <div className="w-3.5 h-3.5 rounded-full border border-dashed border-orange-300"></div>
                                                <span className="text-xs font-medium">0%</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
