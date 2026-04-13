'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { IssuesList } from './issues/IssuesList';
import { IssuesBoard } from './issues/IssuesBoard';
import { IssuesHeader } from './issues/IssuesHeader';
import { 
  groupAndSortTickets, 
  DisplaySettings 
} from '@/lib/utils/issue-display-utils';
import dynamic from 'next/dynamic';

const AddIssueModal = dynamic(() => import('./issues/AddIssueModal').then(mod => mod.AddIssueModal), {
  ssr: false,
});

export function ProjectIssuesRealtimeTab({
  projectId,
  projectName,
  initialTickets,
  users,
  currentUser,
}: {
  projectId: string;
  projectName: string;
  initialTickets: any[];
  users: any[];
  currentUser: any;
}) {
  const [tickets, setTickets] = useState<any[]>(initialTickets || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const deletedIdsRef = useRef<Set<string>>(new Set());
  
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    viewMode: 'list',
    groupBy: 'status',
    sortBy: 'created_at',
    showProperties: ['id', 'status', 'assignee', 'priority']
  });
  
  // Keep local tickets state in sync with server-side prop updates
  // This ensures that router.refresh() after create/delete updates the UI
  useEffect(() => {
    if (!initialTickets) return;
    
    // Filter out any IDs that were recently deleted optimistically
    // to prevent stale server data from "restoring" them.
    const validTickets = initialTickets.filter(t => !deletedIdsRef.current.has(t.id));
    setTickets(validTickets);
  }, [initialTickets]);

  const supabase = useMemo(() => createClient(), []);
  const pendingEventsRef = useRef<any[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Always keep latest users accessible inside Realtime callbacks without re-subscribing
  const usersRef = useRef<any[]>(users);
  useEffect(() => { usersRef.current = users; }, [users]);

  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (activeFilter === 'active') {
      result = tickets.filter(t => t.status === 'in_progress' || t.status === 'to_do');
    } else if (activeFilter === 'backlog') {
      result = tickets.filter(t => t.status === 'backlog');
    }
    return result;
  }, [tickets, activeFilter]);

  // Transform data based on display settings
  const groupedData = useMemo(() => {
    return groupAndSortTickets(filteredTickets, displaySettings);
  }, [filteredTickets, displaySettings]);

  const flushPendingEvents = () => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    const pendingEvents = pendingEventsRef.current;
    if (pendingEvents.length === 0) return;
    pendingEventsRef.current = [];

    setTickets((prev) => {
      let nextTickets = prev;

      for (const payload of pendingEvents) {
        const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE' | string;
        const nextRow = payload.new as any;
        const oldRow = payload.old as any;

        if (!nextRow && !oldRow) continue;

        if (eventType === 'INSERT') {
          // Enrich with user objects so assignee avatar/name shows immediately
          const usersMap = usersRef.current.reduce((m: any, u: any) => { m[u.id] = u; return m; }, {});
          const inserted = {
            ...nextRow,
            projects: { id: projectId, project_name: projectName },
            assignees: nextRow.assignee_id ? (usersMap[nextRow.assignee_id] || null) : null,
            reviewers: nextRow.reviewer_id ? (usersMap[nextRow.reviewer_id] || null) : null,
          };
          if (!nextTickets.some((t) => t.id === inserted.id)) {
            nextTickets = [inserted, ...nextTickets];
          }
          continue;
        }

        if (eventType === 'UPDATE' && nextRow?.id) {
          nextTickets = nextTickets.map((t) => (t.id === nextRow.id ? { ...t, ...nextRow } : t));
          continue;
        }

        if (eventType === 'DELETE' && oldRow?.id) {
          nextTickets = nextTickets.filter((t) => t.id !== oldRow.id);
        }
      }

      return nextTickets;
    });
  };

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`project_tickets_${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
        },
        (payload) => {
          // Manual filtering for the current project
          const nextRow = payload.new as any;
          const oldRow = payload.old as any;
          
          // For INSERT/UPDATE, check the project_id
          if (nextRow && nextRow.project_id && nextRow.project_id !== projectId) {
            return;
          }
          
          // For DELETE, if we don't have project_id in oldRow, 
          // we check if the ID exists in our current tickets list
          if (payload.eventType === 'DELETE' && oldRow?.id) {
            setTickets(prev => {
              const exists = prev.some(t => t.id === oldRow.id);
              if (!exists) return prev;
              // If it exists in our list, it belongs (or belonged) to this project view
              return prev.filter(t => t.id !== oldRow.id);
            });
            // Skip adding to pending events since we handled it immediately for responsiveness
            return;
          }

          pendingEventsRef.current.push(payload);
          if (flushTimerRef.current) return;
          flushTimerRef.current = setTimeout(flushPendingEvents, 16);
        }
      )
      .subscribe();

    return () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      flushPendingEvents();
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [projectId, projectName, supabase]);

  return (
    <div className="flex flex-col h-full bg-[#fbfbfb]">
      <IssuesHeader 
        totalIssues={filteredTickets.length} 
        projects={[{ id: projectId, name: projectName }]}
        users={users}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onOpenModal={() => setIsModalOpen(true)}
        displaySettings={displaySettings}
        onDisplaySettingsChange={setDisplaySettings}
        hideCreateButton={true}
      />

      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto pt-6 px-8 w-full">
          {displaySettings.viewMode === 'list' ? (
            <IssuesList 
              tickets={filteredTickets} 
              groupedData={groupedData}
              displaySettings={displaySettings}
              users={users} 
              onOpenModal={() => setIsModalOpen(true)}
              currentUser={currentUser}
              onOptimisticDelete={(ids) => {
                ids.forEach(id => deletedIdsRef.current.add(id));
                setTickets(prev => prev.filter(t => !ids.includes(t.id)));
              }}
              emptyMessage={`No issues found for ${projectName}`}
            />
          ) : (
            <IssuesBoard 
              groupedData={groupedData}
              users={users}
              currentUser={currentUser}
              displaySettings={displaySettings}
              onOpenModal={() => setIsModalOpen(true)}
            />
          )}
        </div>
      </div>

      {isModalOpen && (
        <AddIssueModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          projects={[{ id: projectId, name: projectName }]}
          users={users}
        />
      )}
    </div>
  );
}

