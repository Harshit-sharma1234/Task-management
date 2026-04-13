'use client';

import { IssuesHeader } from './IssuesHeader';
import { IssuesList } from './IssuesList';
import { IssuesBoard } from './IssuesBoard';

interface IssuesViewProps {
  tickets: any[];
  projects: any[];
  users: any[];
  activeFilter: string;
  currentUser: any;
}

import { useState, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { 
  groupAndSortTickets, 
  DisplaySettings 
} from '@/lib/utils/issue-display-utils';

const AddIssueModal = dynamic(() => import('./AddIssueModal').then(mod => mod.AddIssueModal), {
  ssr: false,
});

export function IssuesView({ tickets: initialTickets, projects, users, activeFilter: initialFilter, currentUser }: IssuesViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(initialFilter || 'all');
  const [tickets, setTickets] = useState<any[]>(initialTickets || []);
  // Track optimistically deleted IDs so stale server props can't restore them
  const deletedIdsRef = useRef<Set<string>>(new Set());

  // Sync with server-side prop updates (e.g. after router.refresh())
  // but never restore items that were already deleted
  useEffect(() => {
    if (!initialTickets) return;
    const validTickets = initialTickets.filter(t => !deletedIdsRef.current.has(t.id));
    setTickets(validTickets);
  }, [initialTickets]);

  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    viewMode: 'list',
    groupBy: 'status',
    sortBy: 'created_at',
    showProperties: ['id', 'status', 'assignee', 'priority']
  });

  // Always have the latest users accessible in Realtime callbacks without stale closures
  const usersRef = useRef<any[]>(users);
  useEffect(() => { usersRef.current = users; }, [users]);

  // Supabase Realtime: listen for DELETE events globally
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('global_tickets_changes')
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'tickets' },
        (payload) => {
          const oldRow = payload.old as any;
          if (oldRow?.id) {
            setTickets(prev => prev.filter(t => t.id !== oldRow.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tickets' },
        (payload) => {
          const newRow = payload.new as any;
          if (newRow?.id) {
            // Enrich with user objects so assignee avatar/name shows immediately
            const usersMap = usersRef.current.reduce((m: any, u: any) => { m[u.id] = u; return m; }, {});
            const enriched = {
              ...newRow,
              assignees: newRow.assignee_id ? (usersMap[newRow.assignee_id] || null) : null,
              reviewers: newRow.reviewer_id ? (usersMap[newRow.reviewer_id] || null) : null,
            };
            setTickets(prev => {
              if (prev.some(t => t.id === enriched.id)) return prev;
              return [enriched, ...prev];
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

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

  return (
    <div className="flex flex-col h-full bg-[#fbfbfb]">
      <IssuesHeader 
        totalIssues={filteredTickets.length} 
        projects={projects}
        users={users}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onOpenModal={() => setIsModalOpen(true)}
        displaySettings={displaySettings}
        onDisplaySettingsChange={setDisplaySettings}
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
              isMyTasks={false}
              onOptimisticDelete={(ids) => {
                ids.forEach(id => deletedIdsRef.current.add(id));
                setTickets(prev => prev.filter(t => !ids.includes(t.id)));
              }}
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
          projects={projects}
          users={users}
        />
      )}
    </div>
  );
}
