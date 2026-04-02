'use client';

import { 
  BarChart2, 
  Users, 
  Calendar, 
  Tag, 
  Milestone, 
  TrendingUp, 
  Clock,
  Plus,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { PrioritySelector } from './PrioritySelector';
import { LeadSelector } from './LeadSelector';
import { TargetDateSelector } from './TargetDateSelector';
import { MemberSelector } from './MemberSelector';
import { StatusSelector } from './StatusSelector';
import { getProjectLogs } from '@/app/dashboard/logging/actions';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { clsx } from 'clsx';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface ProjectSidebarProps {
  project: any;
  users: any[];
  currentMemberIds: string[];
  userRole?: string | null;
}

export function ProjectSidebar({ project, users, currentMemberIds, userRole }: ProjectSidebarProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(true);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [activeProgressTab, setActiveProgressTab] = useState<'Assignees' | 'Labels'>('Assignees');

  useEffect(() => {
    const supabase = createClient();

    // Fetch Logs
    async function fetchLogs() {
      const res = await getProjectLogs(project.id);
      if (!res.error) {
        setLogs(res.data || []);
      }
    }

    // Fetch Tickets for Progress
    async function fetchTickets() {
      const { data } = await supabase
        .from('tickets')
        .select('*, assignees:users!assignee_id(*)')
        .eq('project_id', project.id);
      
      setTickets(data || []);
    }

    fetchLogs();
    fetchTickets();

    // Set up real-time subscription for live updates
    const channel = supabase
      .channel(`project_sidebar_${project.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_logs', filter: `project_id=eq.${project.id}` },
        () => fetchLogs()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets', filter: `project_id=eq.${project.id}` },
        () => fetchTickets()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [project.id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Progress Calculations
  const scopeCount = tickets.length;
  const doneCount = tickets.filter(t => t.status === 'done').length;

  // Group tickets by assignee
  const assigneeStats = tickets.reduce((acc: any, ticket: any) => {
    const assigneeId = ticket.assignee_id || 'unassigned';
    if (!acc[assigneeId]) {
      acc[assigneeId] = {
        id: assigneeId,
        name: ticket.assignees?.name || 'Unassigned',
        email: ticket.assignees?.email || 'unassigned@team.com',
        avatar_url: ticket.assignees?.avatar_url,
        count: 0
      };
    }
    acc[assigneeId].count += 1;
    return acc;
  }, {});

  const sortedAssignees = Object.values(assigneeStats).sort((a: any, b: any) => b.count - a.count);

  return (
    <div className="p-6 space-y-8 border-l border-gray-100 h-full bg-[#fbfbfb] overflow-y-auto custom-scrollbar">
      {/* Properties Panel */}
      <div className="border border-gray-100 rounded-xl bg-white shadow-sm pb-1">
        <div 
          className="px-3 py-2.5 flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 rounded-t-xl"
          onClick={() => setIsPropertiesOpen(!isPropertiesOpen)}
        >
          <span>Properties</span>
          <div className="flex items-center gap-2">
            <ChevronDown 
              size={12} 
              className={`text-gray-400 transition-transform ${isPropertiesOpen ? '' : '-rotate-90'}`} 
            />
          </div>
        </div>
        
        {isPropertiesOpen && (
          <div className="flex flex-col py-1">
            <div className="px-1 py-0.5 group">
              <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest min-w-[80px] shrink-0">Status</span>
                <div className="flex-1 flex justify-end overflow-hidden">
                  <StatusSelector projectId={project.id} currentStatus={project.status} align="right" />
                </div>
              </div>
            </div>

            <div className="px-1 py-0.5 group">
              <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest min-w-[80px] shrink-0">Priority</span>
                <div className="flex-1 flex justify-end overflow-hidden">
                  <PrioritySelector projectId={project.id} currentPriority={project.priority} showLabel={true} align="right" />
                </div>
              </div>
            </div>

            <div className="px-1 py-0.5 group">
              <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest min-w-[80px] shrink-0">Lead</span>
                <div className="flex-1 flex justify-end overflow-hidden">
                  <LeadSelector projectId={project.id} currentLeadId={project.lead_id} users={users} showEmail={true} align="right" />
                </div>
              </div>
            </div>

            <div className="px-1 py-0.5 group">
              <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest min-w-[80px] shrink-0">Members</span>
                <div className="flex-1 flex justify-end overflow-hidden">
                  <MemberSelector 
                    projectId={project.id} 
                    users={users} 
                    currentMemberIds={currentMemberIds} 
                    showEmails={true}
                    align="right"
                  />
                </div>
              </div>
            </div>

            <div className="px-1 py-0.5 group">
              <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest min-w-[80px] shrink-0">Start Date</span>
                <div className="flex-1 flex justify-end overflow-hidden">
                  <TargetDateSelector projectId={project.id} currentTargetDate={project.start_date || null} align="right" />
                </div>
              </div>
            </div>

            <div className="px-1 py-0.5 group">
              <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest min-w-[80px] shrink-0">Due Date</span>
                <div className="flex-1 flex justify-end overflow-hidden">
                  <div className="flex items-center gap-1.5 text-gray-400 cursor-pointer hover:text-gray-600 px-2 py-1 rounded bg-white border border-gray-100/50 w-fit">
                    <Calendar size={12} />
                    <span className="text-[11px] font-semibold">Add target...</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>



      {/* Progress Panel */}
      <div className="space-y-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Progress
          </h3>
          <ChevronDown size={14} className="text-gray-400" />
        </div>
        
        <div className="space-y-5">
          {/* Scope and Done counts */}
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-0.5">
               <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                 <div className="w-1.5 h-1.5 bg-gray-300 rounded-sm"></div>
                 <span>Scope</span>
               </div>
               <span className="text-xl font-bold text-gray-900 tracking-tight">{scopeCount}</span>
             </div>
             <div className="space-y-0.5">
               <div className="flex items-center gap-2 text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                 <div className="w-1.5 h-1.5 bg-indigo-500 rounded-sm"></div>
                 <span>Completed</span>
               </div>
               <span className="text-xl font-bold text-gray-900 tracking-tight">{doneCount}</span>
             </div>
          </div>

          {/* Progress Tabs */}
          <div className="flex p-0.5 bg-gray-50 rounded-lg border border-gray-100">
            <button 
              onClick={() => setActiveProgressTab('Assignees')}
              className={clsx(
                "flex-1 py-1.5 text-[11px] font-bold rounded transition-all",
                activeProgressTab === 'Assignees' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              Assignees
            </button>
            <button 
              onClick={() => setActiveProgressTab('Labels')}
              className={clsx(
                "flex-1 py-1.5 text-[11px] font-bold rounded transition-all",
                activeProgressTab === 'Labels' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              Labels
            </button>
          </div>

          {/* Assignees Content */}
          {activeProgressTab === 'Assignees' && (
            <div className="space-y-4 pt-1">
              {sortedAssignees.length === 0 ? (
                <p className="text-[11px] text-gray-400 text-center py-2">No assignees yet</p>
              ) : (
                <div className="space-y-3">
                  {sortedAssignees.map((stat: any) => (
                    <div key={stat.id} className="flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar name={stat.name} avatarUrl={stat.avatar_url} size="sm" />
                        <span className="text-[11px] font-semibold text-gray-600 group-hover:text-gray-900 transition-colors truncate max-w-[160px]">
                          {stat.email}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-gray-400 group-hover:text-indigo-600 transition-all">
                        {stat.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Labels Placeholder */}
          {activeProgressTab === 'Labels' && (
            <div className="py-4 text-center">
              <p className="text-[11px] text-gray-400">No labels defined for this project.</p>
            </div>
          )}
        </div>
      </div>

      {/* Activity Panel - Restricted to Admin */}
      {(userRole === 'Admin' || userRole?.toLowerCase() === 'admin') && (
        <div className="space-y-4 pt-2 border-t border-gray-50">
          <div 
            className="flex items-center justify-between cursor-pointer group/header"
            onClick={() => setIsActivityOpen(!isActivityOpen)}
          >
            <div className="flex items-center gap-2">
              {isActivityOpen ? (
                <ChevronDown size={14} className="text-gray-400 group-hover/header:text-indigo-500 transition-colors" />
              ) : (
                <ChevronRight size={14} className="text-gray-400 group-hover/header:text-indigo-500 transition-colors" />
              )}
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover/header:text-gray-600 transition-colors">
                Activity
              </h3>
            </div>
            {isActivityOpen && (
              <span className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 cursor-pointer uppercase tracking-tight">Full feed</span>
            )}
          </div>
          
          {isActivityOpen && (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
              {logs.length === 0 ? (
                <div className="flex items-center gap-3 text-xs text-gray-400 border-l-2 border-gray-100 pl-4 ml-2">
                  <span className="text-[11px] font-medium">No activity yet</span>
                </div>
              ) : (
                logs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex flex-col gap-0.5 border-l-2 border-gray-100 pl-4 ml-2 hover:border-indigo-200 transition-colors group mb-3 last:mb-0">
                    <p className="text-[11px] text-gray-600 leading-tight">
                      <span className="font-semibold text-gray-900 mr-1">{log.users?.email || 'Unknown'}</span>
                      {log.description}
                    </p>
                    <span className="text-[9px] text-gray-400 uppercase font-bold tracking-tighter">
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
