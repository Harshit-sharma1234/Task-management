'use client';

import { useState, useMemo, useCallback, memo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CircleDot,
  Circle,
  CheckCircle2,
  CircleEllipsis,
  X,
  ChevronDown,
  LayoutGrid,
  Check,
  Paperclip
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { BulkActionToolbar } from './BulkActionToolbar';

import { IssueStatusSelector } from './IssueStatusSelector';
import { IssueAssigneeSelector } from './IssueAssigneeSelector';
import { IssuePrioritySelector } from './IssuePrioritySelector';

// Status Icon Mapping (matching Projects)
const statusIcons: Record<string, any> = {
  'to_do': { label: 'Todo', color: 'bg-orange-400' },
  'in_progress': { label: 'In Progress', color: 'bg-indigo-500' },
  'review': { label: 'Review', color: 'bg-fuchsia-400' },
  'in_review': { label: 'In Review', color: 'bg-purple-500' },
  'done': { label: 'Done', color: 'bg-green-500' },
  'backlog': { label: 'Backlog', color: 'bg-gray-400' },
  'cancelled': { label: 'Cancelled', color: 'bg-red-500' },
};

interface IssueRowProps {
  ticket: any;
  users: any[];
  isSelected: boolean;
  onToggleSelection: (e: React.MouseEvent, id: string) => void;
  currentUser: any;
  isMyTasks?: boolean;
}

const IssueRow = memo(({ ticket, users, isSelected, onToggleSelection, currentUser, isMyTasks = false }: IssueRowProps) => {
  const router = useRouter();
  const [isInteractive, setIsInteractive] = useState(false);
  const issueHref = `/dashboard/issues/${ticket.id}`;
  const prefetchIssue = useCallback(() => {
    router.prefetch(issueHref);
  }, [router, issueHref]);

  const handleRowClick = () => {
    router.push(issueHref);
  };

  return (
    <div
      onClick={handleRowClick}
      className={twMerge(
        "flex items-center justify-between px-4 py-3 transition-all group border-b border-gray-50 last:border-0 cursor-pointer h-[48px]",
        isSelected ? "bg-indigo-50/40 hover:bg-indigo-50/60" : "hover:bg-indigo-50/20"
      )}
      onMouseEnter={() => setIsInteractive(true)}
      onFocus={() => setIsInteractive(true)}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Selection Checkbox */}
        <div
          onClick={(e) => onToggleSelection(e, ticket.id)}
          className={twMerge(
            "w-4 h-4 rounded border transition-all flex items-center justify-center shrink-0 cursor-default",
            isSelected
              ? "bg-indigo-600 border-indigo-600 shadow-sm opacity-100"
              : "border-gray-200 bg-white opacity-0 group-hover:opacity-100 group-hover:border-indigo-400"
          )}
        >
          {isSelected && <Check size={10} className="text-white stroke-[4px]" />}
        </div>

        {/* Priority Selector */}
        <div 
          className="hidden md:flex items-center shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {isInteractive ? (
            <IssuePrioritySelector
              issueId={ticket.id}
              currentPriority={ticket.priority || 'no_priority'}
              currentUser={currentUser}
              assigneeId={ticket.assignee_id}
              reviewerId={ticket.reviewer_id}
            />
          ) : (
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-tight">
              {(ticket.priority || 'no_priority').replace('_', ' ')}
            </span>
          )}
        </div>

        <Link
          href={issueHref}
          onMouseEnter={prefetchIssue}
          onFocus={prefetchIssue}
          className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter shrink-0 w-14 hover:text-indigo-600 transition-colors"
        >
          {ticket.projects?.project_name?.substring(0, 3).toUpperCase() || 'KAP'}-{ticket.id.substring(0, 2).toUpperCase()}
        </Link>

        {/* Status Selector */}
        <div 
          className="w-24 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {isInteractive ? (
            <IssueStatusSelector
              issueId={ticket.id}
              currentStatus={ticket.status || 'to_do'}
              currentUser={currentUser}
              assigneeId={ticket.assignee_id}
              reviewerId={ticket.reviewer_id}
              hideLabel={true}
            />
          ) : (
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-tight">
              {(ticket.status || 'to_do').replace('_', ' ')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 min-w-0">
          {isMyTasks === true && ticket.reviewer_id === currentUser?.id && ticket.assignee_id !== currentUser?.id && (
            <span className="shrink-0 px-1.5 py-0.5 bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100 rounded text-[9px] font-bold uppercase tracking-wider">
              Reviewer
            </span>
          )}
          <Link
            href={issueHref}
            onMouseEnter={prefetchIssue}
            onFocus={prefetchIssue}
            className={twMerge(
              "text-sm font-semibold truncate transition-colors",
              isSelected ? "text-indigo-900" : "text-gray-700 group-hover:text-indigo-600"
            )}>
            {ticket.title}
          </Link>
        </div>
      </div>

      <div 
        className="flex items-center gap-6 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Project Link */}
        <Link
          href={ticket.projects?.id ? `/dashboard/projects/${ticket.projects.id}` : '#'}
          onClick={(e) => !ticket.projects?.id && e.preventDefault()}
          className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-md border border-gray-100 hover:bg-gray-100 hover:border-gray-200 transition-all cursor-pointer group/project"
        >
          <div className="w-3.5 h-3.5 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden group-hover/project:bg-indigo-100 transition-colors">
            <LayoutGrid size={10} className="text-gray-500 group-hover/project:text-indigo-600" />
          </div>
          <span className="text-[10px] font-bold text-gray-500 truncate max-w-[120px] group-hover/project:text-indigo-600">
            {ticket.projects?.project_name || 'Individual Task'}
          </span>
        </Link>

        {/* Assignee Selector */}
        <div className="flex items-center">
          {isInteractive ? (
            <IssueAssigneeSelector
              issueId={ticket.id}
              currentAssigneeId={ticket.assignee_id}
              currentAssignee={ticket.assignees}
              users={users}
              currentUser={currentUser}
            />
          ) : (
            <UserAvatar
              name={ticket.assignees?.name || 'Unassigned'}
              avatarUrl={ticket.assignees?.avatar_url}
              size="sm"
            />
          )}
        </div>

        <span className="text-[11px] text-gray-400 font-bold uppercase tracking-tighter w-14 text-right">
          {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </div>
  );
});

IssueRow.displayName = 'IssueRow';

import { DisplaySettings } from '@/lib/utils/issue-display-utils';

interface IssuesListProps {
  tickets: any[];
  groupedData: Array<{ name: string; tickets: any[]; id: string }>;
  displaySettings: DisplaySettings;
  users?: any[];
  emptyMessage?: string;
  onOpenModal?: () => void;
  currentUser?: any;
  isMyTasks?: boolean;
  onOptimisticDelete?: (ids: string[]) => void;
}

export function IssuesList({ 
  tickets, 
  groupedData,
  displaySettings,
  users = [], 
  emptyMessage = "No issues found", 
  onOpenModal, 
  currentUser, 
  isMyTasks = false,
  onOptimisticDelete
}: IssuesListProps) {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const parentRef = useRef<HTMLDivElement>(null);

  const toggleSection = useCallback((id: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, []);

  const toggleSelection = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Flatten items for virtualization (Header + Tickets)
  const flatItems = useMemo(() => {
    const items: Array<{ type: 'header' | 'ticket'; data: any; sectionId?: string; sectionName?: string; isFirstInSection?: boolean; isLastInSection?: boolean }> = [];
    
    if (!groupedData) return items;

    groupedData.forEach((group) => {
      items.push({ type: 'header', data: group.name, sectionId: group.id });
      if (!collapsedSections[group.id]) {
        group.tickets.forEach((ticket: any, idx: number) => {
          items.push({ 
            type: 'ticket', 
            data: ticket, 
            sectionId: group.id,
            isFirstInSection: idx === 0,
            isLastInSection: idx === group.tickets.length - 1
          });
        });
      }
    });
    return items;
  }, [groupedData, collapsedSections]);

  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => parentRef.current?.parentElement || null,
    estimateSize: (index) => {
      const item = flatItems[index];
      return item.type === 'header' ? 44 : 48;
    },
    overscan: tickets.length > 250 ? 8 : 12,
  });

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <CircleDot className="text-gray-400" size={32} />
        </div>
        <h3 className="text-lg font-medium text-gray-900">{emptyMessage}</h3>
        <p className="text-sm text-gray-500 mt-1 mb-6">Get started by creating your first issue.</p>

        {onOpenModal && (
          <button
            onClick={onOpenModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Create Issue
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={parentRef} className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const item = flatItems[virtualRow.index];
        if (!item) return null;
        
        if (item.type === 'header') {
          const sectionId = item.sectionId || 'none';
          const groupName = item.data;
          const isCollapsed = collapsedSections[sectionId];
          const group = groupedData.find(g => g.id === sectionId);
          const sectionCount = group?.tickets.length ?? 0;

          // Try to find a status-specific color if grouping by status
          const statusData = statusIcons[sectionId] || { color: 'bg-gray-400' };
          const statusColor = displaySettings.groupBy === 'status' ? statusData.color : 'bg-indigo-400';

          return (
            <div
              key={`header-${sectionId}`}
              onClick={() => toggleSection(sectionId)}
              className="absolute top-0 left-0 w-full flex items-center gap-2 mb-3 cursor-pointer group select-none"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <ChevronDown
                size={14}
                className={twMerge(
                  "text-gray-400 group-hover:text-gray-600 transition-transform duration-200",
                  isCollapsed && "-rotate-90"
                )}
              />
              {displaySettings.groupBy !== 'none' && (
                 <div className={twMerge("w-2 h-2 rounded-full", statusColor)}></div>
              )}
              <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                {groupName}
              </h2>
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold">
                {sectionCount}
              </span>
            </div>
          );
        }

        const ticket = item.data;
        const isSelected = selectedIds.has(ticket.id);

        return (
          <div
            key={ticket.id}
            className={twMerge(
              "absolute top-0 left-0 w-full transition-all duration-200",
              "z-[1] focus-within:z-50 focus-within:shadow-xl"
            )}
            style={{
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <div className={twMerge(
              "bg-white border-x transition-all duration-200 relative",
              item.isFirstInSection && "rounded-t-xl border-t",
              item.isLastInSection && "rounded-b-xl border-b shadow-sm mb-8",
              isSelected ? "border-indigo-200" : "border-gray-100",
              !item.isLastInSection && "border-b border-gray-50"
            )}>
                <IssueRow
                  ticket={item.data}
                  users={users}
                  isSelected={selectedIds.has(item.data.id)}
                  onToggleSelection={toggleSelection}
                  currentUser={currentUser}
                  isMyTasks={displaySettings.groupBy === 'assignee'}
                />
            </div>
          </div>
        );
      })}

      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="max-w-5xl mx-auto px-6 pb-6 flex justify-center pointer-events-auto">
          <BulkActionToolbar
            selectedIds={Array.from(selectedIds)}
            onClear={clearSelection}
            totalTickets={tickets.length}
            currentUser={currentUser}
            onOptimisticDelete={onOptimisticDelete}
          />
        </div>
      </div>
    </div>
  );
}
