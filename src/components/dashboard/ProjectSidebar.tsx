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
import type { SelectorHandle } from './StatusSelector';
import { getProjectLogs } from '@/app/dashboard/logging/actions';
import { updateProjectTargetDate, updateProjectDueDate } from '@/app/dashboard/actions';
import { useState, useEffect, useMemo, useRef } from 'react';
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

  const supabase = useMemo(() => createClient(), []);

  // Refs for each selector to enable full-row click-to-open
  const statusRef = useRef<SelectorHandle>(null);
  const priorityRef = useRef<SelectorHandle>(null);
  const leadRef = useRef<SelectorHandle>(null);
  const membersRef = useRef<SelectorHandle>(null);
  const startDateRef = useRef<SelectorHandle>(null);
  const dueDateRef = useRef<SelectorHandle>(null);

  useEffect(() => {

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

  // Progress Calculations (memoized)
  const { scopeCount, doneCount, assigneeStats, sortedAssignees } = useMemo(() => {
    const scope = tickets.length;
    const done = tickets.filter(t => t.status === 'done').length;

    const stats = tickets.reduce((acc: any, ticket: any) => {
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

    const sorted = Object.values(stats).sort((a: any, b: any) => b.count - a.count);

    return { scopeCount: scope, doneCount: done, assigneeStats: stats, sortedAssignees: sorted };
  }, [tickets]);

  return (
    <div className="p-5 space-y-6 border-l border-gray-100 h-full bg-[#fbfbfb] overflow-y-auto custom-scrollbar">
      {/* Properties Panel */}
      <div className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] border border-gray-100/80 overflow-hidden">
        <div 
          className="px-4 py-3 flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-widest bg-gradient-to-b from-gray-50/80 to-white hover:from-gray-50 cursor-pointer transition-all border-b border-gray-100/60"
          onClick={() => setIsPropertiesOpen(!isPropertiesOpen)}
        >
          <span>Properties</span>
          <ChevronDown 
            size={13} 
            className={`text-gray-400 transition-transform duration-200 ${isPropertiesOpen ? '' : '-rotate-90'}`} 
          />
        </div>
        
        {isPropertiesOpen && (
          <div className="flex flex-col py-1.5 px-1.5 gap-0.5">
            {/* Status Row */}
            <div className="group relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <div 
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50/80 cursor-pointer transition-all duration-150"
                onClick={() => statusRef.current?.toggle()}
              >
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider group-hover:text-gray-600 transition-colors">Status</span>
                <div className="flex items-center overflow-hidden">
                  <StatusSelector ref={statusRef} projectId={project.id} currentStatus={project.status} align="right" />
                </div>
              </div>
            </div>

            {/* Priority Row */}
            <div className="group relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <div 
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50/80 cursor-pointer transition-all duration-150"
                onClick={() => priorityRef.current?.toggle()}
              >
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider group-hover:text-gray-600 transition-colors">Priority</span>
                <div className="flex items-center overflow-hidden">
                  <PrioritySelector ref={priorityRef} projectId={project.id} currentPriority={project.priority} showLabel={true} align="right" />
                </div>
              </div>
            </div>

            {/* Lead Row */}
            <div className="group relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <div 
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50/80 cursor-pointer transition-all duration-150"
                onClick={() => leadRef.current?.toggle()}
              >
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider group-hover:text-gray-600 transition-colors">Lead</span>
                <div className="flex items-center overflow-hidden">
                  <LeadSelector ref={leadRef} projectId={project.id} currentLeadId={project.lead_id} users={users} showEmail={true} align="right" />
                </div>
              </div>
            </div>

            {/* Members Row */}
            <div className="group relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <div 
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50/80 cursor-pointer transition-all duration-150"
                onClick={() => membersRef.current?.toggle()}
              >
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider group-hover:text-gray-600 transition-colors">Members</span>
                <div className="flex items-center overflow-hidden">
                  <MemberSelector 
                    ref={membersRef}
                    projectId={project.id} 
                    users={users} 
                    currentMemberIds={currentMemberIds} 
                    showEmails={true}
                    align="right"
                  />
                </div>
              </div>
            </div>

            {/* Divider between core properties and dates */}
            <div className="mx-3 my-1 border-t border-gray-100/60" />

            {/* Start Date Row */}
            <div className="group relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <div 
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50/80 cursor-pointer transition-all duration-150"
                onClick={() => startDateRef.current?.toggle()}
              >
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider group-hover:text-gray-600 transition-colors">Start Date</span>
                <div className="flex items-center overflow-hidden">
                  <TargetDateSelector ref={startDateRef} projectId={project.id} currentTargetDate={project.start_date || null} align="right" onUpdate={updateProjectTargetDate} />
                </div>
              </div>
            </div>

            {/* Due Date Row */}
            <div className="group relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <div 
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50/80 cursor-pointer transition-all duration-150"
                onClick={() => dueDateRef.current?.toggle()}
              >
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider group-hover:text-gray-600 transition-colors">Due Date</span>
                <div className="flex items-center overflow-hidden">
                  <TargetDateSelector ref={dueDateRef} projectId={project.id} currentTargetDate={project.target_date || null} align="right" onUpdate={updateProjectDueDate} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>



      {/* Progress Panel */}
      <div className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] border border-gray-100/80 overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100/60 bg-gradient-to-b from-gray-50/80 to-white">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
            Progress
          </h3>
          {scopeCount > 0 && (
            <span className="text-[10px] font-bold text-indigo-500 tabular-nums">
              {Math.round((doneCount / scopeCount) * 100)}%
            </span>
          )}
        </div>
        
        <div className="p-4 space-y-5">
          {/* Progress Bar */}
          {scopeCount > 0 && (
            <div className="space-y-2">
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.round((doneCount / scopeCount) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Scope and Done counts */}
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-0.5">
               <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                 <div className="w-1.5 h-1.5 bg-gray-300 rounded-sm"></div>
                 <span>Scope</span>
               </div>
               <span className="text-xl font-bold text-gray-900 tracking-tight tabular-nums">{scopeCount}</span>
             </div>
             <div className="space-y-0.5">
               <div className="flex items-center gap-2 text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                 <div className="w-1.5 h-1.5 bg-indigo-500 rounded-sm"></div>
                 <span>Completed</span>
               </div>
               <span className="text-xl font-bold text-gray-900 tracking-tight tabular-nums">{doneCount}</span>
             </div>
          </div>

          {/* Progress Tabs */}
          <div className="flex p-0.5 bg-gray-50 rounded-lg border border-gray-100">
            <button 
              onClick={() => setActiveProgressTab('Assignees')}
              className={clsx(
                "flex-1 py-1.5 text-[11px] font-bold rounded transition-all duration-150",
                activeProgressTab === 'Assignees' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              Assignees
            </button>
            <button 
              onClick={() => setActiveProgressTab('Labels')}
              className={clsx(
                "flex-1 py-1.5 text-[11px] font-bold rounded transition-all duration-150",
                activeProgressTab === 'Labels' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              Labels
            </button>
          </div>

          {/* Assignees Content */}
          {activeProgressTab === 'Assignees' && (
            <div className="space-y-1 pt-1">
              {sortedAssignees.length === 0 ? (
                <p className="text-[11px] text-gray-400 text-center py-2">No assignees yet</p>
              ) : (
                <div className="space-y-0.5">
                  {sortedAssignees.map((stat: any) => (
                    <div key={stat.id} className="flex items-center justify-between group cursor-pointer px-2 py-1.5 rounded-lg hover:bg-gray-50/80 transition-all duration-150">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar name={stat.name} avatarUrl={stat.avatar_url} size="sm" />
                        <span className="text-[11px] font-semibold text-gray-600 group-hover:text-gray-900 transition-colors truncate max-w-[130px]">
                          {stat.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-400 rounded-full transition-all duration-300" 
                            style={{ width: `${scopeCount > 0 ? Math.round((stat.count / scopeCount) * 100) : 0}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-gray-400 group-hover:text-indigo-600 transition-all tabular-nums min-w-[16px] text-right">
                          {stat.count}
                        </span>
                      </div>
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
        <div className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] border border-gray-100/80 overflow-hidden">
          <div 
            className="px-4 py-3 flex items-center justify-between cursor-pointer group/header bg-gradient-to-b from-gray-50/80 to-white border-b border-gray-100/60"
            onClick={() => setIsActivityOpen(!isActivityOpen)}
          >
            <div className="flex items-center gap-2">
              {isActivityOpen ? (
                <ChevronDown size={13} className="text-gray-400 group-hover/header:text-indigo-500 transition-colors" />
              ) : (
                <ChevronRight size={13} className="text-gray-400 group-hover/header:text-indigo-500 transition-colors" />
              )}
              <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest group-hover/header:text-gray-600 transition-colors">
                Activity
              </h3>
            </div>
            {isActivityOpen && (
              <span className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 cursor-pointer uppercase tracking-tight">Full feed</span>
            )}
          </div>
          
          {isActivityOpen && (
            <div className="p-4 space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
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
