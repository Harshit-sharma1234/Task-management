'use client';

import { useState } from 'react';
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
  Filter,
  SlidersHorizontal
} from 'lucide-react';
import { clsx } from 'clsx';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { BulkActionToolbar } from './BulkActionToolbar';

import { IssueStatusSelector } from './IssueStatusSelector';
import { IssueAssigneeSelector } from './IssueAssigneeSelector';

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

import { IssuePrioritySelector } from './IssuePrioritySelector';

interface IssuesListProps {
  tickets: any[];
  users?: any[];
  emptyMessage?: string;
}

export function IssuesList({ tickets, users = [], emptyMessage = "No issues found" }: IssuesListProps) {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Functional Filtering State
  const [showFilters, setShowFilters] = useState(false);
  const [showViewOptions, setShowViewOptions] = useState(false);
  const [hideDone, setHideDone] = useState(false);
  const [hideCancelled, setHideCancelled] = useState(false);

  // Group tickets by status
  const groupedTickets = tickets.reduce((acc: any, ticket: any) => {
    const status = ticket.status || 'to_do';
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(ticket);
    return acc;
  }, {});

  const toggleSection = (status: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  const toggleSelection = (e: React.MouseEvent, id: string) => {
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
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Define status order
  const statusOrder = ['in_progress', 'review', 'in_review', 'to_do', 'backlog', 'done', 'cancelled'];
  const orderedStatuses = statusOrder.filter(status => groupedTickets[status]);

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <CircleDot className="text-gray-400" size={32} />
        </div>
        <h3 className="text-lg font-medium text-gray-900">{emptyMessage}</h3>
        <p className="text-sm text-gray-500 mt-1">Get started by creating your first issue.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative pb-20">
      {/* Functional View Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="relative">
          <button 
            onClick={() => { setShowFilters(!showFilters); setShowViewOptions(false); }}
            className={clsx(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors border",
              showFilters ? "bg-gray-100 border-gray-200 text-gray-900" : "bg-white border-dashed border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 hover:bg-gray-50"
            )}
          >
            <Filter size={14} />
            Filter
          </button>
          
          {showFilters && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowFilters(false)} />
              <div className="absolute top-full mt-1 left-0 w-56 bg-white border border-gray-100 shadow-xl rounded-xl z-20 py-2 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 pb-2 mb-2 border-b border-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Visibility Filters</div>
                <button 
                  onClick={() => setHideDone(!hideDone)}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors"
                >
                  Hide 'Done' issues
                  {hideDone && <Check size={14} className="text-indigo-600" />}
                </button>
                <button 
                  onClick={() => setHideCancelled(!hideCancelled)}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors"
                >
                  Hide 'Cancelled' issues
                  {hideCancelled && <Check size={14} className="text-indigo-600" />}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button 
            onClick={() => { setShowViewOptions(!showViewOptions); setShowFilters(false); }}
            className={clsx(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors border",
              showViewOptions ? "bg-gray-100 border-gray-200 text-gray-900" : "bg-white border-dashed border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 hover:bg-gray-50"
            )}
          >
            <SlidersHorizontal size={14} />
            Display
          </button>
          
          {showViewOptions && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowViewOptions(false)} />
              <div className="absolute top-full mt-1 left-0 w-48 bg-white border border-gray-100 shadow-xl rounded-xl z-20 py-2 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 pb-2 mb-2 border-b border-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Grouping</div>
                <div className="px-3 py-1.5 flex items-center justify-between w-full text-left text-xs font-medium text-gray-700 bg-gray-50/50 cursor-default">
                  Group by Status
                  <Check size={14} className="text-indigo-600" />
                </div>
                <div className="px-3 py-1.5 flex items-center justify-between w-full text-left text-xs font-medium text-gray-400 pointer-events-none">
                  Group by Assignee
                  <span className="text-[9px] bg-gray-100 px-1 py-0.5 rounded text-gray-500">Soon</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {orderedStatuses.map((status) => {
        if (hideDone && status === 'done') return null;
        if (hideCancelled && status === 'cancelled') return null;

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
                  {sectionTickets.map((ticket: any) => {
                    const isSelected = selectedIds.has(ticket.id);
                    return (
                      <div
                        key={ticket.id}
                        className={clsx(
                          "flex items-center justify-between px-4 py-2.5 transition-all group border-b border-gray-50 last:border-0",
                          isSelected ? "bg-indigo-50/40 hover:bg-indigo-50/60" : "hover:bg-gray-50/50"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Selection Checkbox */}
                          <div 
                            onClick={(e) => toggleSelection(e, ticket.id)}
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
                          <div className="hidden md:flex items-center shrink-0">
                            <IssuePrioritySelector 
                              issueId={ticket.id} 
                              currentPriority={ticket.priority || 'no_priority'} 
                            />
                          </div>

                          <Link 
                            href={`/dashboard/issues/${ticket.id}`}
                            className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter shrink-0 w-14 hover:text-indigo-600 transition-colors"
                          >
                            {ticket.projects?.project_name?.substring(0, 3).toUpperCase() || 'KAP'}-{ticket.id.substring(0, 2).toUpperCase()}
                          </Link>

                          {/* Status Selector */}
                          <div className="w-24 shrink-0">
                            <IssueStatusSelector 
                              issueId={ticket.id} 
                              currentStatus={ticket.status || 'to_do'} 
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

                        <div className="flex items-center gap-6 shrink-0">
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
                            />
                          </div>

                          <span className="text-[11px] text-gray-400 font-bold uppercase tracking-tighter w-14 text-right">
                            {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
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
      />
    </div>
  );
}
