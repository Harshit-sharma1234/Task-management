'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import { ChevronDown } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { createClient } from '@/lib/supabase/client';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Shimmer } from '@/components/ui/Skeleton';

interface ProjectProgressPanelProps {
  projectId: string;
  users: any[];
}

export const ProjectProgressPanel = memo(({ projectId, users }: ProjectProgressPanelProps) => {
  const [tickets, setTickets] = useState<Array<{ id: string; status: string | null; assignee_id: string | null }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Assignees' | 'Labels'>('Assignees');
  const supabase = useMemo(() => createClient(), []);

  const assigneeUsers = useMemo(() => {
    return users?.reduce((acc: Record<string, any>, u: any) => {
      acc[u.id] = u;
      return acc;
    }, {}) || {};
  }, [users]);

  const fetchTickets = async () => {
    setIsLoading(true);

    const { data: rows } = await supabase
      .from('tickets')
      // Only fetch the minimal fields needed for counts.
      .select('id, status, assignee_id')
      .eq('project_id', projectId);

    const normalizedRows = (rows || []).map((r: any) => ({
      id: r.id,
      status: r.status ?? null,
      assignee_id: r.assignee_id ?? null,
    }));

    setTickets(normalizedRows);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTickets();

    const channel = supabase
      .channel(`project_progress_${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets', filter: `project_id=eq.${projectId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            if (!payload.new?.id) return;
            const newTicket = {
              id: payload.new.id,
              status: payload.new.status ?? null,
              assignee_id: payload.new.assignee_id ?? null,
            };
            setTickets(prev => [...prev, newTicket]);
          } else if (payload.eventType === 'UPDATE') {
            if (!payload.new?.id) return;
            const nextAssigneeId = payload.new.assignee_id ?? null;
            setTickets(prev => prev.map(t => 
              t.id === payload.new.id
                ? { ...t, status: payload.new.status ?? null, assignee_id: nextAssigneeId }
                : t
            ));
          } else if (payload.eventType === 'DELETE') {
            if (!payload.old?.id) return;
            setTickets((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, supabase]);

  // Progress Calculations
  const { scopeCount, doneCount, sortedAssignees } = useMemo(() => {
    const scope = tickets.length;
    const done = tickets.filter(t => t.status === 'done').length;

    const stats = tickets.reduce((acc: any, ticket: any) => {
      let assigneeId = ticket.assignee_id;
      let user = assigneeId ? assigneeUsers[assigneeId] : null;

      // Group all missing or invalid assignees into a unified 'unassigned' bucket
      if (!user) {
        assigneeId = 'unassigned';
      }

      if (!acc[assigneeId]) {
        acc[assigneeId] = {
          id: assigneeId,
          name: assigneeId === 'unassigned' ? 'Unassigned' : user.name,
          email: assigneeId === 'unassigned' ? 'No assignee' : user.email,
          avatar_url: assigneeId === 'unassigned' ? null : user.avatar_url,
          count: 0
        };
      }
      acc[assigneeId].count += 1;
      return acc;
    }, {});

    const sorted = Object.values(stats).sort((a: any, b: any) => b.count - a.count);

    return { scopeCount: scope, doneCount: done, sortedAssignees: sorted };
  }, [tickets, assigneeUsers]);

  return (
    <div className="space-y-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Progress
        </h3>
        <ChevronDown size={14} className="text-gray-400" />
      </div>
      
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
           <div className="space-y-0.5">
             <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
               <div className="w-1.5 h-1.5 bg-gray-300 rounded-sm"></div>
               <span>Scope</span>
             </div>
             {isLoading ? (
               <Shimmer className="h-6 w-10 rounded-sm" />
             ) : (
               <span className="text-xl font-bold text-gray-900 tracking-tight">{scopeCount}</span>
             )}
           </div>
           <div className="space-y-0.5">
             <div className="flex items-center gap-2 text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
               <div className="w-1.5 h-1.5 bg-indigo-500 rounded-sm"></div>
               <span>Completed</span>
             </div>
             {isLoading ? (
               <Shimmer className="h-6 w-10 rounded-sm" />
             ) : (
               <span className="text-xl font-bold text-gray-900 tracking-tight">{doneCount}</span>
             )}
           </div>
        </div>

        <div className="flex p-0.5 bg-gray-50 rounded-lg border border-gray-100">
          <button 
            onClick={() => setActiveTab('Assignees')}
            className={twMerge(
              "flex-1 py-1.5 text-[11px] font-bold rounded transition-all",
              activeTab === 'Assignees' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
            )}
          >
            Assignees
          </button>
          <button 
            onClick={() => setActiveTab('Labels')}
            className={twMerge(
              "flex-1 py-1.5 text-[11px] font-bold rounded transition-all",
              activeTab === 'Labels' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
            )}
          >
            Labels
          </button>
        </div>

        {activeTab === 'Assignees' && (
          <div className="space-y-4 pt-1">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Shimmer className="w-6 h-6 rounded-full" />
                      <Shimmer className="h-4 w-28 rounded-sm" />
                    </div>
                    <Shimmer className="h-3 w-8 rounded-sm" />
                  </div>
                ))}
              </div>
            ) : sortedAssignees.length === 0 ? (
              <p className="text-[11px] text-gray-400 text-center py-2">No assignees yet</p>
            ) : (
              <div className="space-y-3">
                {sortedAssignees.map((stat: any) => (
                  <div key={stat.id} className="flex items-center justify-between group">
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

        {activeTab === 'Labels' && (
          <div className="py-4 text-center">
            <p className="text-[11px] text-gray-400">No labels defined for this project.</p>
          </div>
        )}
      </div>
    </div>
  );
});

ProjectProgressPanel.displayName = 'ProjectProgressPanel';
