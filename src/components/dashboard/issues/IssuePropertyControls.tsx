'use client';

import { useState, useEffect } from 'react';
import { updateIssue } from '@/app/dashboard/issues/actions';
import {
  CircleDot,
  Circle,
  CheckCircle2,
  CircleEllipsis,
  SignalHigh,
  SignalMedium,
  SignalLow,
  MoreHorizontal,
  User,
  ChevronDown,
  FolderKanban
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { IssueStatusSelector } from './IssueStatusSelector';
import { IssuePrioritySelector } from './IssuePrioritySelector';
import { IssueAssigneeSelector } from './IssueAssigneeSelector';
import { IssueReviewerSelector } from './IssueReviewerSelector';

const statusOptions = [
  { value: 'backlog', label: 'Backlog', icon: CircleDot, color: 'text-gray-400' },
  { value: 'to_do', label: 'Todo', icon: Circle, color: 'text-gray-400' },
  { value: 'in_progress', label: 'In Progress', icon: CircleEllipsis, color: 'text-yellow-500' },
  { value: 'done', label: 'Done', icon: CheckCircle2, color: 'text-indigo-500' },
  { value: 'cancelled', label: 'Cancelled', icon: Circle, color: 'text-red-400' },
];

const priorityOptions = [
  { value: 'no_priority', label: 'No priority', icon: MoreHorizontal, color: 'text-gray-400' },
  { value: 'low', label: 'Low', icon: SignalLow, color: 'text-indigo-500' },
  { value: 'medium', label: 'Medium', icon: SignalMedium, color: 'text-yellow-500' },
  { value: 'high', label: 'High', icon: SignalHigh, color: 'text-red-500' },
  { value: 'urgent', label: 'Urgent', icon: SignalHigh, color: 'text-red-600' },
];

interface IssuePropertyControlsProps {
  ticketId: string;
  initialStatus: string;
  initialPriority: string;
  initialAssigneeId: string | null;
  initialReviewerId: string | null;
  currentUserId: string;
  projectName: string;
  dueDate: string | null;
  users: { id: string, name: string, avatar_url?: string | null }[];
}

export function IssuePropertyControls({
  ticketId,
  initialStatus,
  initialPriority,
  initialAssigneeId,
  initialReviewerId,
  currentUserId,
  projectName,
  dueDate,
  users
}: IssuePropertyControlsProps) {
  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState(initialPriority);
  const [assigneeId, setAssigneeId] = useState(initialAssigneeId || '');
  const [reviewerId, setReviewerId] = useState(initialReviewerId || '');
  const [isUpdating, setIsUpdating] = useState(false);
  
  useEffect(() => {
    setStatus(initialStatus);
    setPriority(initialPriority);
    setAssigneeId(initialAssigneeId || '');
    setReviewerId(initialReviewerId || '');
  }, [initialStatus, initialPriority, initialAssigneeId, initialReviewerId]);

  const [isPropertiesOpen, setIsPropertiesOpen] = useState(true);
  const [isProjectOpen, setIsProjectOpen] = useState(true);
  
  const router = useRouter();

  const handleUpdate = async (updates: any) => {
    setIsUpdating(true);
    const result = await updateIssue(ticketId, updates);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || 'Failed to update issue');
    }
    setIsUpdating(false);
  };

  return (
    <div className="space-y-4">
      {/* Properties Section */}
      <div className="border border-gray-100 rounded-xl bg-white shadow-sm pb-1">
        <div 
          className="px-3 py-2.5 flex items-center justify-between text-xs font-semibold text-gray-700 bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 rounded-t-xl"
          onClick={() => setIsPropertiesOpen(!isPropertiesOpen)}
        >
          <span>Properties</span>
          <ChevronDown 
            size={12} 
            className={`text-gray-400 transition-transform ${isPropertiesOpen ? '' : '-rotate-90'}`} 
          />
        </div>
        
        {isPropertiesOpen && (
          <div className="flex flex-col py-1">
            {/* Status */}
            <div className="px-1 py-0.5 group">
              <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
                <span className="text-[11px] font-medium text-gray-400 w-16 shrink-0">Status</span>
                <div className="flex-1">
                  <IssueStatusSelector 
                    issueId={ticketId}
                    currentStatus={status}
                  />
                </div>
              </div>
            </div>

            {/* Priority */}
            <div className="px-1 py-0.5 group">
              <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
                <span className="text-[11px] font-medium text-gray-400 w-16 shrink-0">Priority</span>
                <div className="flex-1">
                  <IssuePrioritySelector 
                    issueId={ticketId}
                    currentPriority={priority}
                  />
                </div>
              </div>
            </div>

            {/* Assignee */}
            <div className="px-1 py-0.5 group">
              <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
                <span className="text-[11px] font-medium text-gray-400 w-16 shrink-0">Assignee</span>
                <div className="flex-1">
                  <IssueAssigneeSelector 
                    issueId={ticketId}
                    currentAssigneeId={assigneeId}
                    currentAssignee={users.find(u => u.id === assigneeId) || null}
                    users={users as any}
                  />
                </div>
              </div>
            </div>

            {/* Reviewer */}
            <div className="px-1 py-0.5 group">
              <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
                <span className="text-[11px] font-medium text-gray-400 w-16 shrink-0">Reviewer</span>
                <div className="flex-1">
                  <IssueReviewerSelector 
                    issueId={ticketId}
                    currentReviewerId={reviewerId}
                    assigneeId={assigneeId}
                    currentReviewer={users.find(u => u.id === reviewerId) || null}
                    users={users as any}
                  />
                </div>
              </div>
            </div>
            
            {/* Due Date */}
            <div className="px-1 py-0.5 group">
              <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
                <span className="text-[11px] font-medium text-gray-400 w-16 shrink-0">Due Date</span>
                <div className="flex-1 px-1 text-[11px] font-medium text-gray-600">
                  {dueDate ? new Date(dueDate).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'No due date'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Project Section */}
      <div className="border border-gray-100 rounded-xl bg-white shadow-sm pb-1">
        <div 
          className="px-3 py-2.5 flex items-center justify-between text-xs font-semibold text-gray-700 bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 rounded-t-xl"
          onClick={() => setIsProjectOpen(!isProjectOpen)}
        >
          <span>Project</span>
          <ChevronDown 
            size={12} 
            className={`text-gray-400 transition-transform ${isProjectOpen ? '' : '-rotate-90'}`} 
          />
        </div>
        {isProjectOpen && (
          <div className="p-2">
            <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer text-gray-700">
              <FolderKanban size={13} className="text-gray-400 shrink-0" />
              <span className="text-[12px] font-medium tracking-tight">{projectName}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
