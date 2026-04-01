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

interface ProjectSidebarProps {
  project: any;
  users: any[];
  currentMemberIds: string[];
  userRole?: string | null;
}

export function ProjectSidebar({ project, users, currentMemberIds, userRole }: ProjectSidebarProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  useEffect(() => {
    async function fetchLogs() {
      const res = await getProjectLogs(project.id);
      if (!res.error) {
        setLogs(res.data || []);
      }
    }
    fetchLogs();

    // Set up real-time subscription for live updates
    const supabase = createClient();
    const channel = supabase
      .channel('project_activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_logs',
          filter: `project_id=eq.${project.id}`
        },
        () => {
          // Re-fetch when a new log appears
          fetchLogs();
        }
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
  return (
    <div className="p-6 space-y-8 border-l border-gray-100 h-full bg-[#fbfbfb] overflow-y-auto custom-scrollbar">
      {/* Properties Panel */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            Properties
          </h3>
          <Plus size={14} className="text-gray-400 cursor-pointer hover:text-gray-600" />
        </div>
        
        <div className="grid grid-cols-[100px_1fr] gap-y-4 items-center text-sm">
          <span className="text-gray-400 font-medium">Status</span>
          <div className="w-full">
            <StatusSelector projectId={project.id} currentStatus={project.status} align="right" />
          </div>

          <span className="text-gray-400 font-medium">Priority</span>
          <div className="w-full">
            <PrioritySelector projectId={project.id} currentPriority={project.priority} showLabel={true} align="right" />
          </div>

          <span className="text-gray-400 font-medium">Lead</span>
          <div className="w-full">
            <LeadSelector projectId={project.id} currentLeadId={project.lead_id} users={users} showEmail={true} align="right" />
          </div>

          <span className="text-gray-400 font-medium">Members</span>
          <MemberSelector 
            projectId={project.id} 
            users={users} 
            currentMemberIds={currentMemberIds} 
            showEmails={true}
            align="right"
          />

          <span className="text-gray-400 font-medium">Dates</span>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between w-full">
               <span className="text-[11px] text-gray-400 uppercase">Start</span>
               <TargetDateSelector projectId={project.id} currentTargetDate={project.start_date || null} align="right" />
            </div>
            <div className="flex items-center justify-between w-full">
               <span className="text-[11px] text-gray-400 uppercase">Target</span>
               <div className="flex items-center gap-1.5 text-gray-400 cursor-pointer hover:text-gray-600 px-2 py-1 rounded bg-white border border-gray-100/50">
                  <Calendar size={12} />
                  <span className="text-xs text-right">Add target...</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Milestones Panel */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            Milestones
          </h3>
          <Plus size={14} className="text-gray-400 cursor-pointer hover:text-gray-600" />
        </div>
        <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
          Add milestones to organize work within your project. <span className="text-indigo-500 cursor-pointer hover:underline">Learn more</span>
        </p>
      </div>

      {/* Progress Panel */}
      <div className="space-y-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Progress
          </h3>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-0.5">
               <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                 <div className="w-1.5 h-1.5 bg-gray-300 rounded-sm"></div>
                 <span>Scope</span>
               </div>
               <span className="text-xl font-bold text-gray-900 tracking-tight">0</span>
             </div>
             <div className="space-y-0.5">
               <div className="flex items-center gap-2 text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                 <div className="w-1.5 h-1.5 bg-indigo-500 rounded-sm"></div>
                 <span>Done</span>
               </div>
               <span className="text-xl font-bold text-gray-900 tracking-tight">0</span>
             </div>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 py-1 text-[11px] font-bold bg-indigo-50 text-indigo-600 rounded border border-indigo-100 hover:bg-indigo-100/50 transition-colors">Assignees</button>
            <button className="flex-1 py-1 text-[11px] font-bold text-gray-400 rounded border border-transparent hover:bg-gray-50 transition-colors">Labels</button>
          </div>
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
