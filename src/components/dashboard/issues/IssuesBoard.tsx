'use client';

import { useMemo } from 'react';
import { 
  MoreHorizontal, 
  Plus, 
  LayoutGrid, 
  Clock,
  Paperclip,
  Check
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { GroupBy, STATUS_ORDER, PRIORITY_ORDER, DisplaySettings } from '@/lib/utils/issue-display-utils';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { IssuePrioritySelector } from './IssuePrioritySelector';
import { IssueStatusSelector } from './IssueStatusSelector';
import Link from 'next/link';

interface IssuesBoardProps {
  groupedData: Array<{ name: string; tickets: any[]; id: string }>;
  users: any[];
  currentUser: any;
  displaySettings: DisplaySettings;
  onOpenModal?: () => void;
}

const statusIcons: Record<string, any> = {
  'to_do': { label: 'Todo', color: 'bg-orange-400' },
  'in_progress': { label: 'In Progress', color: 'bg-indigo-500' },
  'review': { label: 'Review', color: 'bg-fuchsia-400' },
  'in_review': { label: 'In Review', color: 'bg-purple-500' },
  'done': { label: 'Done', color: 'bg-green-500' },
  'backlog': { label: 'Backlog', color: 'bg-gray-400' },
  'cancelled': { label: 'Cancelled', color: 'bg-red-500' },
};

function IssueCard({ ticket, users, currentUser, displaySettings }: { ticket: any, users: any[], currentUser: any, displaySettings: DisplaySettings }) {
  const showProp = (id: string) => displaySettings.showProperties.includes(id);

  return (
    <Link 
      href={`/dashboard/issues/${ticket.id}`}
      className="block group bg-white border border-gray-100 rounded-xl p-4 mb-3 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer relative"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5 min-w-0">
             {showProp('id') && (
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                 {ticket.projects?.project_name?.substring(0, 3).toUpperCase() || 'KAP'}-{ticket.id.substring(0, 2).toUpperCase()}
               </span>
             )}
             <h3 className="text-[13px] font-semibold text-gray-800 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2">
               {ticket.title}
             </h3>
          </div>
          {ticket.assignees && showProp('assignee') && (
            <div className="shrink-0 mt-0.5">
              <UserAvatar 
                name={ticket.assignees.name} 
                avatarUrl={ticket.assignees.avatar_url} 
                size="xs" 
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            {showProp('priority') && (
              <div onClick={(e) => e.preventDefault()}>
                <IssuePrioritySelector 
                  issueId={ticket.id}
                  currentPriority={ticket.priority || 'no_priority'}
                  currentUser={currentUser}
                  assigneeId={ticket.assignee_id}
                  reviewerId={ticket.reviewer_id}
                />
              </div>
            )}
            {showProp('status') && displaySettings.groupBy !== 'status' && (
              <div onClick={(e) => e.preventDefault()}>
                <IssueStatusSelector 
                   issueId={ticket.id}
                   currentStatus={ticket.status || 'to_do'}
                   currentUser={currentUser}
                   assigneeId={ticket.assignee_id}
                   reviewerId={ticket.reviewer_id}
                   hideLabel
                />
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
             {ticket.attachments?.length > 0 && (
               <div className="flex items-center gap-1 text-gray-400">
                  <Paperclip size={10} />
                  <span className="text-[10px] font-bold">{ticket.attachments.length}</span>
               </div>
             )}
             {showProp('created') && (
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                  {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
             )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function IssuesBoard({ groupedData, users, currentUser, displaySettings, onOpenModal }: IssuesBoardProps) {
  return (
    <div className="flex gap-6 h-full overflow-x-auto pb-10 min-h-[calc(100vh-250px)]">
      {groupedData.map((group) => {
        const statusData = statusIcons[group.id] || { color: 'bg-gray-400' };
        const statusColor = displaySettings.groupBy === 'status' ? statusData.color : 'bg-indigo-400';

        return (
          <div 
            key={group.id} 
            className="flex flex-col w-[300px] shrink-0"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <div className={twMerge("w-2 h-2 rounded-full", statusColor)} />
                <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest truncate max-w-[180px]">
                  {group.name}
                </h2>
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold">
                  {group.tickets.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button 
                   onClick={onOpenModal}
                   className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Plus size={14} />
                </button>
                <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors">
                  <MoreHorizontal size={14} />
                </button>
              </div>
            </div>

            {/* Column Content */}
            <div className="flex-1 overflow-y-auto pr-1">
               {group.tickets.length === 0 ? (
                 <div className="border border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                    <LayoutGrid size={24} className="text-gray-200 mb-2" />
                    <span className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">Empty column</span>
                 </div>
               ) : (
                 group.tickets.map((ticket) => (
                   <IssueCard 
                     key={ticket.id} 
                     ticket={ticket} 
                     users={users}
                     currentUser={currentUser}
                     displaySettings={displaySettings}
                   />
                 ))
               )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
