'use client';

import { useState, useMemo, useCallback, memo } from 'react';
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
import { clsx } from 'clsx';
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
}

const IssueRow = memo(({ ticket, users, isSelected, onToggleSelection, currentUser }: IssueRowProps) => {
  const router = useRouter();

  const handleRowClick = () => {
    router.push(`/dashboard/issues/${ticket.id}`);
  };

  return (
    <div
      onClick={handleRowClick}
      className={clsx(
        "flex items-center justify-between px-4 py-2.5 transition-all group border-b border-gray-50 last:border-0 cursor-pointer",
        isSelected ? "bg-indigo-50/40 hover:bg-indigo-50/60" : "hover:bg-gray-50/50"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Selection Checkbox */}
        <div
          onClick={(e) => onToggleSelection(e, ticket.id)}
          className={clsx(
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
          <IssuePrioritySelector
            issueId={ticket.id}
            currentPriority={ticket.priority || 'no_priority'}
            currentUser={currentUser}
            assigneeId={ticket.assignee_id}
            reviewerId={ticket.reviewer_id}
          />
        </div>

        <Link
          href={`/dashboard/issues/${ticket.id}`}
          className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter shrink-0 w-14 hover:text-indigo-600 transition-colors"
        >
          {ticket.projects?.project_name?.substring(0, 3).toUpperCase() || 'KAP'}-{ticket.id.substring(0, 2).toUpperCase()}
        </Link>

        {/* Status Selector */}
        <div 
          className="w-24 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <IssueStatusSelector
            issueId={ticket.id}
            currentStatus={ticket.status || 'to_do'}
            currentUser={currentUser}
            assigneeId={ticket.assignee_id}
            reviewerId={ticket.reviewer_id}
          />
        </div>

        <Link
          href={`/dashboard/issues/${ticket.id}`}
          className={clsx(
            "text-sm font-semibold truncate transition-colors",
            isSelected ? "text-indigo-900" : "text-gray-700 group-hover:text-indigo-600"
          )}>
          {ticket.title}
        </Link>
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
          <IssueAssigneeSelector
            issueId={ticket.id}
            currentAssigneeId={ticket.assignee_id}
            currentAssignee={ticket.assignees}
            users={users}
            currentUser={currentUser}
          />
        </div>

        <span className="text-[11px] text-gray-400 font-bold uppercase tracking-tighter w-14 text-right">
          {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </div>
  );
});

IssueRow.displayName = 'IssueRow';

interface IssuesListProps {
  tickets: any[];
  users?: any[];
  emptyMessage?: string;
  onOpenModal?: () => void;
  currentUser?: any;
}

export function IssuesList({ tickets, users = [], emptyMessage = "No issues found", onOpenModal, currentUser }: IssuesListProps) {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Group tickets by status (memoized)
  const groupedTickets = useMemo(() => tickets.reduce((acc: any, ticket: any) => {
    const status = ticket.status || 'to_do';
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(ticket);
    return acc;
  }, {}), [tickets]);

  const toggleSection = useCallback((status: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [status]: !prev[status]
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

  // Define status order
  const statusOrder = ['in_progress', 'review', 'in_review', 'to_do', 'backlog', 'done', 'cancelled'];
  const orderedStatuses = useMemo(() => statusOrder.filter(status => groupedTickets[status]), [groupedTickets]);

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
    <div className="space-y-8 relative pb-20">

      {orderedStatuses.map((status) => {
        const statusData = statusIcons[status] || statusIcons['to_do'];
        const statusColor = statusData.color;
        const statusLabel = statusData.label;
        const isCollapsed = collapsedSections[status];
        const sectionTickets = groupedTickets[status];

        return (
          <div key={status}>
            <div
              onClick={() => toggleSection(status)}
              className="flex items-center gap-2 mb-3 cursor-pointer group select-none"
            >
              <ChevronDown
                size={14}
                className={clsx(
                  "text-gray-400 group-hover:text-gray-600 transition-transform duration-200",
                  isCollapsed && "-rotate-90"
                )}
              />
              <div className={clsx("w-2 h-2 rounded-full", statusColor)}></div>
              <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                {statusLabel}
              </h2>
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold">
                {sectionTickets.length}
              </span>
            </div>

            {!isCollapsed && (
              <div className={clsx(
                "bg-white border rounded-xl shadow-sm transition-all duration-200",
                selectedIds.size > 0 ? "border-indigo-100" : "border-gray-100"
              )}>
                <div className="divide-y divide-gray-50">
                  {sectionTickets.map((ticket: any) => (
                    <IssueRow
                      key={ticket.id}
                      ticket={ticket}
                      users={users}
                      isSelected={selectedIds.has(ticket.id)}
                      onToggleSelection={toggleSelection}
                      currentUser={currentUser}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <BulkActionToolbar
        selectedIds={Array.from(selectedIds)}
        onClear={clearSelection}
        totalTickets={tickets.length}
        currentUser={currentUser}
      />
    </div>
  );
}
