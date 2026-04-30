'use client';

import { useState } from 'react';
import { updateIssue } from '@/app/dashboard/[workspace]/issues/actions';
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
  FolderKanban
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { IssueStatusSelector } from './IssueStatusSelector';
import { IssuePrioritySelector } from './IssuePrioritySelector';
import { IssueAssigneeSelector } from './IssueAssigneeSelector';

const statusOptions = [
  { value: 'backlog', label: 'Backlog', icon: CircleDot, color: 'text-gray-400' },
  { value: 'to_do', label: 'Todo', icon: Circle, color: 'text-gray-400' },
  { value: 'in_progress', label: 'In Progress', icon: CircleEllipsis, color: 'text-yellow-500' },
  { value: 'review', label: 'Review', icon: CircleEllipsis, color: 'text-orange-500' },
  { value: 'in_review', label: 'In Review', icon: CircleEllipsis, color: 'text-orange-600' },
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

interface PropertyInlineRowProps {
  ticketId: string;
  initialStatus: string;
  initialPriority: string;
  initialAssigneeId: string | null;
  projectName: string;
  users: { id: string, name: string, avatar_url?: string | null }[];
  currentUser: any;
  reviewerId: string | null;
}

export function PropertyInlineRow({
  ticketId,
  initialStatus,
  initialPriority,
  initialAssigneeId,
  projectName,
  users,
  currentUser,
  reviewerId
}: PropertyInlineRowProps) {
  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState(initialPriority);
  const [assigneeId, setAssigneeId] = useState(initialAssigneeId || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const handleUpdate = async (updates: any) => {
    setIsUpdating(true);
    const result = await updateIssue(ticketId, updates);
    if (result.success) {
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to update issue');
      // Revert local state on error
      if (updates.status) setStatus(initialStatus);
      if (updates.priority) setPriority(initialPriority);
      if (updates.assignee_id !== undefined) setAssigneeId(initialAssigneeId || '');
    }
    setIsUpdating(false);
  };

  const currentStatusOpt = statusOptions.find(o => o.value === status) || statusOptions[1];
  const StatusIcon = currentStatusOpt.icon;

  const currentPriorityOpt = priorityOptions.find(o => o.value === priority) || priorityOptions[0];
  const PriorityIcon = currentPriorityOpt.icon;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Status Selector */}
      <IssueStatusSelector
        issueId={ticketId}
        currentStatus={status}
        currentUser={currentUser}
        assigneeId={assigneeId}
        reviewerId={reviewerId}
      />

      {/* Priority Selector */}
      <IssuePrioritySelector
        issueId={ticketId}
        currentPriority={priority}
        currentUser={currentUser}
        assigneeId={assigneeId}
        reviewerId={reviewerId}
      />

      {/* Assignee Selector */}
      <IssueAssigneeSelector
        issueId={ticketId}
        currentAssigneeId={assigneeId}
        currentAssignee={users.find(u => u.id === assigneeId) || null}
        users={users as any}
      />

      {/* Project (Read Only link) */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50/50 border border-gray-100 rounded-md text-[11px] font-bold text-gray-500 shadow-sm border-dashed">
        <FolderKanban size={14} className="text-indigo-400" />
        <span className="truncate max-w-[120px] tracking-tight">{projectName}</span>
      </div>
    </div>
  );
}
