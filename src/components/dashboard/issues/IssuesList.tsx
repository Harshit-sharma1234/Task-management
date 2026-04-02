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
  LayoutGrid
} from 'lucide-react';
import { clsx } from 'clsx';
import { UserAvatar } from '@/components/ui/UserAvatar';

// Status Icon Mapping (matching Projects)
const statusIcons: Record<string, any> = {
  'to_do': { label: 'Todo', color: 'bg-orange-400' },
  'in_progress': { label: 'In Progress', color: 'bg-indigo-500' },
  'done': { label: 'Done', color: 'bg-green-500' },
  'review': { label: 'Review', color: 'bg-orange-500' },
  'backlog': { label: 'Backlog', color: 'bg-gray-400' },
  'cancelled': { label: 'Cancelled', color: 'bg-red-500' },
};

interface IssuesListProps {
  tickets: any[];
  emptyMessage?: string;
}

export function IssuesList({ tickets, emptyMessage = "No issues found" }: IssuesListProps) {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

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
    <div className="space-y-8">
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
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                <div className="divide-y divide-gray-50">
                  {sectionTickets.map((ticket: any) => {
                    return (
                      <Link
                        key={ticket.id}
                        href={`/dashboard/issues/${ticket.id}`}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/50 transition-all group border-b border-gray-50 last:border-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-4 h-4 rounded border border-gray-200 group-hover:border-gray-300 transition-colors shrink-0" />

                          {/* Priority (Signal Bars) */}
                          <div className="hidden md:flex items-center w-8 shrink-0">
                            {ticket.priority === 'urgent' && (
                              <div className="flex gap-0.5 items-end h-3">
                                <div className="w-1 h-3 bg-red-500 rounded-sm"></div>
                                <div className="w-1 h-3 bg-red-500 rounded-sm"></div>
                                <div className="w-1 h-3 bg-red-500 rounded-sm"></div>
                              </div>
                            )}
                            {ticket.priority === 'high' && (
                              <div className="flex gap-0.5 items-end h-3">
                                <div className="w-1 h-2 bg-red-400 rounded-sm"></div>
                                <div className="w-1 h-2.5 bg-red-400 rounded-sm"></div>
                                <div className="w-1 h-3 bg-red-400 rounded-sm"></div>
                              </div>
                            )}
                            {ticket.priority === 'medium' && (
                              <div className="flex gap-0.5 items-end h-3">
                                <div className="w-1 h-1.5 bg-yellow-400 rounded-sm"></div>
                                <div className="w-1 h-2.5 bg-yellow-400 rounded-sm"></div>
                                <div className="w-1 h-3 bg-yellow-100 rounded-sm"></div>
                              </div>
                            )}
                            {ticket.priority === 'low' && (
                              <div className="flex gap-0.5 items-end h-3">
                                <div className="w-1 h-1.5 bg-indigo-400 rounded-sm"></div>
                                <div className="w-1 h-3 bg-indigo-100 rounded-sm"></div>
                                <div className="w-1 h-3 bg-indigo-100 rounded-sm"></div>
                              </div>
                            )}
                            {(ticket.priority === 'no_priority' || !ticket.priority) && (
                              <div className="w-4 h-0.5 bg-gray-200 rounded-full"></div>
                            )}
                          </div>

                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter shrink-0 w-14">
                            {ticket.projects?.project_name?.substring(0, 3).toUpperCase() || 'KAP'}-{ticket.id.substring(0, 2).toUpperCase()}
                          </span>

                          {/* Status (Colored Dot + Label) */}
                          <div className="flex items-center gap-1.5 w-24 shrink-0">
                            <div className={clsx("w-2 h-2 rounded-full", statusColor)}></div>
                            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-tight truncate">
                              {statusLabel}
                            </span>
                          </div>

                          <span className="text-sm font-semibold text-gray-700 truncate group-hover:text-indigo-600 transition-colors">
                            {ticket.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-6 shrink-0">
                          <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-md border border-gray-100">
                            <div className="w-3.5 h-3.5 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                              <LayoutGrid size={10} className="text-gray-500" />
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 truncate max-w-[120px]">
                              {ticket.projects?.project_name || 'Individual Task'}
                            </span>
                          </div>

                          <div className="flex items-center">
                            <UserAvatar
                              name={ticket.assignees?.name || 'Unassigned'}
                              avatarUrl={ticket.assignees?.avatar_url}
                              size="sm"
                            />
                          </div>

                          <span className="text-[11px] text-gray-400 font-bold uppercase tracking-tighter w-14 text-right">
                            {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
