'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  CircleDot, 
  Circle, 
  CheckCircle2, 
  CircleEllipsis,
  SignalHigh,
  SignalMedium,
  SignalLow,
  MoreHorizontal,
  X,
  Plus,
  SlidersHorizontal,
  LayoutGrid,
  ChevronDown,
  Paperclip
} from 'lucide-react';
import { clsx } from 'clsx';
import dynamic from 'next/dynamic';

const AddIssueModal = dynamic(() => import('./issues/AddIssueModal').then(mod => mod.AddIssueModal), {
  ssr: false,
});

// Status Icon Mapping
const statusIcons: Record<string, any> = {
  'to_do': { label: 'Todo', icon: Circle, color: 'text-gray-400' },
  'in_progress': { label: 'In Progress', icon: CircleEllipsis, color: 'text-yellow-500' },
  'done': { label: 'Done', icon: CheckCircle2, color: 'text-indigo-500' },
  'backlog': { label: 'Backlog', icon: CircleDot, color: 'text-gray-400' },
  'review': { label: 'Review', icon: CircleEllipsis, color: 'text-orange-500' },
  'in_review': { label: 'In Review', icon: CircleEllipsis, color: 'text-orange-600' },
  'cancelled': { label: 'Cancelled', icon: X, color: 'text-red-400' },
};

// Priority Icon Mapping
const priorityIcons: Record<string, any> = {
  'urgent': { label: 'Urgent', icon: SignalHigh, color: 'text-red-600' },
  'high': { label: 'High', icon: SignalHigh, color: 'text-red-500' },
  'medium': { label: 'Medium', icon: SignalMedium, color: 'text-yellow-500' },
  'low': { label: 'Low', icon: SignalLow, color: 'text-indigo-500' },
  'no_priority': { label: 'No priority', icon: MoreHorizontal, color: 'text-gray-400' },
};

interface MyTasksViewProps {
  initialTickets: any[];
  projects: any[];
  users: any[];
}

export function MyTasksView({ initialTickets, projects, users }: MyTasksViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="flex flex-col h-full bg-[#fbfbfb]">
      {/* Header Section */}
      <div className="flex flex-col bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="h-16 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-gray-900">My issues</h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="ml-2 flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus size={16} />
              <span>New Issue</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pt-6 px-8 w-full">
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="mb-4 flex items-center gap-2 group cursor-pointer select-none"
        >
          <ChevronDown 
            size={14} 
            className={clsx(
              "text-gray-400 group-hover:text-gray-600 transition-transform duration-200",
              !isExpanded && "-rotate-90"
            )} 
          />
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Other active</h2>
          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">
            {initialTickets.length}
          </span>
        </div>

        {isExpanded && (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          {initialTickets.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <CircleDot className="text-gray-200 mb-4" size={48} />
              <p className="text-gray-500 text-sm font-medium">No tasks found in this view</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {initialTickets.map((ticket) => {
                const statusData = statusIcons[ticket.status] || statusIcons['to_do'];
                const StatusIcon = statusData.icon;
                const statusColor = statusData.color;
                const priorityData = priorityIcons[ticket.priority] || priorityIcons['no_priority'];
                const PriorityIcon = priorityData.icon;
                const priorityColor = priorityData.color;

                return (
                  <Link 
                    key={ticket.id}
                    href={`/dashboard/issues/${ticket.id}`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/80 transition-all group relative border-l-2 border-transparent hover:border-indigo-500"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={clsx("shrink-0", statusColor)}>
                        <StatusIcon size={18} strokeWidth={2.5} />
                      </div>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter shrink-0 w-16">
                          {ticket.projects?.project_name?.substring(0, 3).toUpperCase() || 'KAP'}-{ticket.id.substring(0, 2).toUpperCase()}
                        </span>
                        <span className="text-sm font-semibold text-gray-800 truncate group-hover:text-indigo-600 transition-colors">
                          {ticket.title}
                        </span>
                        
                        {/* Attachment Indicator */}
                        {ticket.attachments && ticket.attachments.length > 0 && (
                          <div className="flex items-center gap-1 ml-2 text-gray-400 group/attach-indicator border-l border-gray-100 pl-2 shrink-0">
                            <Paperclip size={12} className="group-hover/attach-indicator:text-indigo-600 transition-colors" />
                            <span className="text-[10px] font-bold">{ticket.attachments.length}</span>
                          </div>
                        )}
                      </div>
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

                      <div className="flex items-center -space-x-1">
                        <div className="w-6 h-6 rounded-full bg-indigo-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-600 uppercase shadow-sm">
                          KT
                        </div>
                      </div>

                      <span className="text-[11px] text-gray-400 font-bold uppercase tracking-tighter w-14 text-right">
                        {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        )}
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
