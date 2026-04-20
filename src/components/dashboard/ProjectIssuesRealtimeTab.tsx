'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { IssuesList } from './issues/IssuesList';
import { IssuesHeader } from './issues/IssuesHeader';
import { loadProjectIssuesChunk } from '@/app/dashboard/[workspace]/projects/[id]/actions';
import { useRouter } from 'next/navigation';
import {
  groupAndSortTickets,
  DisplaySettings
} from '@/lib/utils/issue-display-utils';
import dynamic from 'next/dynamic';

const AddIssueModal = dynamic(() => import('./issues/AddIssueModal').then(mod => mod.AddIssueModal), {
  ssr: false,
});

const IssuesBoard = dynamic(() => import('./issues/IssuesBoard').then(mod => mod.IssuesBoard), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-gray-50" />,
});

export function ProjectIssuesRealtimeTab({
  projectId,
  projectName,
  initialTickets,
  users,
  currentUser,
  initialLimit = 40,
  totalLimit = 120,
  initialFilter = 'all',
}: {
  projectId: string;
  projectName: string;
  initialTickets: any[];
  users: any[];
  currentUser: any;
  initialLimit?: number;
  totalLimit?: number;
  initialFilter?: string;
}) {
  const router = useRouter();
  const PAGE_SIZE = 40;
  const SCROLL_THRESHOLD_PX = 500;
  const [tickets, setTickets] = useState<any[]>(initialTickets || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(initialFilter);
  const [isHydratingMore, setIsHydratingMore] = useState(false);
  const [hasMoreServerIssues, setHasMoreServerIssues] = useState(totalLimit > initialLimit);
  const deletedIdsRef = useRef<Set<string>>(new Set());
  const listScrollRef = useRef<HTMLDivElement>(null);
  const nextOffsetRef = useRef(initialLimit);
  const isFetchingMoreRef = useRef(false);

  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    viewMode: 'list',
    groupBy: 'status',
    sortBy: 'created_at',
    showProperties: ['id', 'status', 'assignee', 'priority']
  });

  const handleFilterChange = (newFilter: string) => {
    setActiveFilter(newFilter);
    // 🚀 Send filter strictly to backend (Step 1 requirement)
    router.push(`/dashboard/projects/${projectId}?tab=issues&filter=${newFilter}`, { scroll: false });
  };

  // Keep local tickets state in sync with server-side prop updates
  // This ensures that router.refresh() after create/delete updates the UI
  useEffect(() => {
    if (!initialTickets) return;

    // Filter out any IDs that were recently deleted optimistically
    // to prevent stale server data from "restoring" them.
    const validTickets = initialTickets.filter(t => !deletedIdsRef.current.has(t.id));
    setTickets(validTickets);
    nextOffsetRef.current = Math.min(initialLimit, validTickets.length);
    setHasMoreServerIssues(totalLimit > nextOffsetRef.current);
    isFetchingMoreRef.current = false;
    setIsHydratingMore(false);
  }, [initialTickets, initialLimit, totalLimit, activeFilter]);

  const supabase = useMemo(() => createClient(), []);
  const pendingEventsRef = useRef<any[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Always keep latest users accessible inside Realtime callbacks without re-subscribing
  const usersById = useMemo(() => {
    const map: Record<string, any> = {};
    for (const u of users) map[u.id] = u;
    return map;
  }, [users]);
  const usersByIdRef = useRef<Record<string, any>>(usersById);
  useEffect(() => { usersByIdRef.current = usersById; }, [usersById]);

  // ✅ Filtering is now COMPLETELY handled by Database. No frontend filtering!
  const filteredTickets = tickets;

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
          const inserted = {
            ...nextRow,
            projects: { id: projectId, project_name: projectName },
            assignees: nextRow.assignee_id ? (usersByIdRef.current[nextRow.assignee_id] || null) : null,
            reviewers: nextRow.reviewer_id ? (usersByIdRef.current[nextRow.reviewer_id] || null) : null,
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

  const fetchNextPage = async () => {
    if (isFetchingMoreRef.current) return;
    if (!hasMoreServerIssues) return;

    const remaining = totalLimit - nextOffsetRef.current;
    if (remaining <= 0) {
      setHasMoreServerIssues(false);
      return;
    }

    isFetchingMoreRef.current = true;
    setIsHydratingMore(true);
    const limit = Math.min(PAGE_SIZE, remaining);
    const result = await loadProjectIssuesChunk(projectId, nextOffsetRef.current, limit, activeFilter);
    setIsHydratingMore(false);
    isFetchingMoreRef.current = false;

    if (result?.error || !result?.data) return;
    const fetched = result.data;
    if (fetched.length === 0) {
      setHasMoreServerIssues(false);
      return;
    }

    nextOffsetRef.current += fetched.length;
    setHasMoreServerIssues(nextOffsetRef.current < totalLimit && fetched.length === limit);

    setTickets((prev) => {
      const existingIds = new Set(prev.map((t: any) => t.id));
      const merged = [...prev];
      for (const ticket of fetched) {
        if (!existingIds.has(ticket.id) && !deletedIdsRef.current.has(ticket.id)) {
          merged.push(ticket);
        }
      }
      return merged;
    });
  };

  useEffect(() => {
    const el = listScrollRef.current;
    if (!el) return;

    const onScroll = () => {
      if (!hasMoreServerIssues || isFetchingMoreRef.current) return;
      const remainingScroll = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (remainingScroll <= SCROLL_THRESHOLD_PX) {
        void fetchNextPage();
      }
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [hasMoreServerIssues, tickets.length]);

  return (
    <div className="flex flex-col h-full bg-[#fbfbfb]">
      <IssuesHeader
        totalIssues={filteredTickets.length}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        onOpenModal={() => setIsModalOpen(true)}
        displaySettings={displaySettings}
        onDisplaySettingsChange={setDisplaySettings}
        hideCreateButton={true}
      />

      <div className="flex-1 overflow-hidden">
        <div ref={listScrollRef} className="h-full overflow-y-auto pt-6 px-8 w-full">
          {isHydratingMore && (
            <div className="mb-3 text-[11px] font-medium text-gray-400">Loading more issues...</div>
          )}
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

