'use client';

import { IssuesHeader } from './IssuesHeader';
import { IssuesList } from './IssuesList';

interface IssuesViewProps {
  tickets: any[];
  projects: any[];
  users: any[];
  activeFilter: string;
  currentUser: any;
  workspaceId: string;
  workspaceSlug: string;
  initialLimit?: number;
  totalLimit?: number;
}

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { loadIssuesChunk } from '@/app/dashboard/[workspace]/issues/list-actions';
import {
  groupAndSortTickets,
  DisplaySettings
} from '@/lib/utils/issue-display-utils';

const AddIssueModal = dynamic(() => import('./AddIssueModal').then(mod => mod.AddIssueModal), {
  ssr: false,
});

const IssuesBoard = dynamic(() => import('./IssuesBoard').then(mod => mod.IssuesBoard), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-gray-50" />,
});

export function IssuesView({
  tickets: initialTickets,
  projects,
  users,
  activeFilter: initialFilter,
  currentUser,
  workspaceId,
  workspaceSlug,
  initialLimit = 40,
  totalLimit = 120
}: IssuesViewProps) {
  const PAGE_SIZE = 40;
  const SCROLL_THRESHOLD_PX = 500;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(initialFilter || 'all');
  const [tickets, setTickets] = useState<any[]>(initialTickets || []);
  const [isHydratingMore, setIsHydratingMore] = useState(false);
  const [hasMoreServerIssues, setHasMoreServerIssues] = useState(totalLimit > initialLimit);
  // Track optimistically deleted IDs so stale server props can't restore them
  const deletedIdsRef = useRef<Set<string>>(new Set());
  const listScrollRef = useRef<HTMLDivElement>(null);
  const nextOffsetRef = useRef(initialLimit);
  const isFetchingMoreRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    const params = new URLSearchParams(searchParams.toString());
    params.set('filter', filter);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Sync with server-side prop updates (e.g. after router.refresh() or navigation)
  // but never restore items that were already deleted
  useEffect(() => {
    if (initialFilter) setActiveFilter(initialFilter);
  }, [initialFilter]);

  useEffect(() => {
    if (!initialTickets) return;
    const validTickets = initialTickets.filter(t => !deletedIdsRef.current.has(t.id));
    setTickets(validTickets);
    nextOffsetRef.current = Math.min(initialLimit, validTickets.length);
    setHasMoreServerIssues(totalLimit > nextOffsetRef.current);
    isFetchingMoreRef.current = false;
    setIsHydratingMore(false);
  }, [initialTickets]);

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
    const result = await loadIssuesChunk(nextOffsetRef.current, limit, workspaceId);
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

  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    viewMode: 'list',
    groupBy: 'status',
    sortBy: 'created_at',
    showProperties: ['id', 'status', 'assignee', 'priority']
  });

  // Keep a fast lookup map for realtime row enrichment.
  const usersById = useMemo(() => {
    const map: Record<string, any> = {};
    for (const u of users) {
      map[u.id] = u;
    }
    return map;
  }, [users]);
  const usersByIdRef = useRef<Record<string, any>>(usersById);
  useEffect(() => { usersByIdRef.current = usersById; }, [usersById]);

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
            const enriched = {
              ...newRow,
              assignees: newRow.assignee_id ? (usersByIdRef.current[newRow.assignee_id] || null) : null,
              reviewers: newRow.reviewer_id ? (usersByIdRef.current[newRow.reviewer_id] || null) : null,
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
    } else if (activeFilter === 'urgent') {
      result = tickets.filter(t => t.priority === 'urgent' && (t.assignee_id === currentUser?.id || t.reviewer_id === currentUser?.id) && t.status !== 'done');
    } else if (activeFilter === 'completed') {
      result = tickets.filter(t => t.status === 'done' && (t.assignee_id === currentUser?.id || t.reviewer_id === currentUser?.id));
    } else if (activeFilter === 'in_progress') {
      result = tickets.filter(t => (t.status === 'in_progress' || t.status === 'in_review') && (t.assignee_id === currentUser?.id || t.reviewer_id === currentUser?.id));
    }
    return result;
  }, [tickets, activeFilter, currentUser]);

  // Transform data based on display settings
  const groupedData = useMemo(() => {
    return groupAndSortTickets(filteredTickets, displaySettings);
  }, [filteredTickets, displaySettings]);

  return (
    <div className="flex flex-col h-full bg-white">
      <IssuesHeader
        totalIssues={filteredTickets.length}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        onOpenModal={() => setIsModalOpen(true)}
        displaySettings={displaySettings}
        onDisplaySettingsChange={setDisplaySettings}
      />

      <div className="flex-1 overflow-hidden">
        <div ref={listScrollRef} className="h-full overflow-y-auto px-8 w-full">
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
              isMyTasks={false}
              workspaceSlug={workspaceSlug}
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
              workspaceSlug={workspaceSlug}
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
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}
