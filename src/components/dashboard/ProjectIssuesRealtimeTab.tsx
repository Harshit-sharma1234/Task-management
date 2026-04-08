'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { IssuesList } from './issues/IssuesList';

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
  const supabase = useMemo(() => createClient(), []);

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
          const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE' | string;
          const nextRow = payload.new as any;
          const oldRow = payload.old as any;

          if (!nextRow && !oldRow) return;

          if (eventType === 'INSERT') {
            const inserted = {
              ...nextRow,
              // Realtime payload won't include the join; preserve UI expectations.
              projects: { id: projectId, project_name: projectName },
            };

            setTickets((prev) => {
              if (prev.some((t) => t.id === inserted.id)) return prev;
              return [inserted, ...prev];
            });
            return;
          }

          if (eventType === 'UPDATE') {
            if (!nextRow?.id) return;
            setTickets((prev) =>
              prev.map((t) => (t.id === nextRow.id ? { ...t, ...nextRow } : t))
            );
            return;
          }

          if (eventType === 'DELETE') {
            if (!oldRow?.id) return;
            setTickets((prev) => prev.filter((t) => t.id !== oldRow.id));
            return;
          }
        }
      )
      .subscribe();

    return () => {
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
      />
    </div>
  );
}

