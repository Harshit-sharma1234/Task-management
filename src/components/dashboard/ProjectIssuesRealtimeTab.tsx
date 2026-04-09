'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { IssuesList } from './issues/IssuesList';
import dynamic from 'next/dynamic';

const AddIssueModal = dynamic(() => import('./issues/AddIssueModal').then(mod => mod.AddIssueModal), {
  ssr: false,
});

export function ProjectIssuesRealtimeTab({
  projectId,
  projectName,
  initialTickets,
  users,
}: {
  projectId: string;
  projectName: string;
  initialTickets: any[];
  users: any[];
}) {
  const [tickets, setTickets] = useState<any[]>(initialTickets || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const pendingEventsRef = useRef<any[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          const inserted = {
            ...nextRow,
            projects: { id: projectId, project_name: projectName },
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
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
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
      // Properly stop listening and clean up the subscription.
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [projectId, projectName, supabase]);

  return (
    <div className="p-8 bg-[#fbfbfb] min-h-full">
      <IssuesList
        tickets={tickets}
        users={users}
        emptyMessage={`No issues found for ${projectName}`}
        onOpenModal={() => setIsModalOpen(true)}
      />

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

