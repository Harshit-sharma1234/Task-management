'use client';

import { useState } from 'react';
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
  User
} from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  { value: 'low', label: 'Low', icon: SignalLow, color: 'text-blue-500' },
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
  users: { id: string, name: string }[];
}

export function IssuePropertyControls({ 
  ticketId, 
  initialStatus, 
  initialPriority, 
  initialAssigneeId,
  initialReviewerId,
  currentUserId,
  users 
}: IssuePropertyControlsProps) {
  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState(initialPriority);
  const [assigneeId, setAssigneeId] = useState(initialAssigneeId || '');
  const [reviewerId, setReviewerId] = useState(initialReviewerId || '');
  const [isUpdating, setIsUpdating] = useState(false);
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
    <div className="space-y-6">
      {/* Status */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-2">
          <CircleDot size={12} />
          Status
        </span>
        <div className="relative group w-fit">
          <select
            className="appearance-none bg-gray-50 border border-gray-100 rounded-md px-3 py-2 text-sm font-medium focus:outline-none pr-8 cursor-pointer hover:bg-gray-100 transition-colors"
            value={status}
            onChange={(e) => {
              const val = e.target.value;
              setStatus(val);
              handleUpdate({ status: val });
            }}
            disabled={isUpdating}
          >
            {statusOptions.map((opt) => (
              <option 
                key={opt.value} 
                value={opt.value}
                disabled={opt.value === 'done' && currentUserId !== initialReviewerId}
              >
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
             {(() => {
                const opt = statusOptions.find(o => o.value === status) || statusOptions[1];
                const Icon = opt.icon;
                return <Icon size={14} className={opt.color} />;
             })()}
          </div>
        </div>
        {status === 'done' && currentUserId !== initialReviewerId && (
          <p className="text-[9px] text-red-400 mt-1">Only reviewer can mark as Done</p>
        )}
      </div>

      {/* Priority */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-2">
          <SignalLow size={12} />
          Priority
        </span>
        <div className="relative group w-fit">
          <select
            className="appearance-none bg-gray-50 border border-gray-100 rounded-md px-3 py-2 text-sm font-medium focus:outline-none pr-8 cursor-pointer hover:bg-gray-100 transition-colors"
            value={priority}
            onChange={(e) => {
              const val = e.target.value;
              setPriority(val);
              handleUpdate({ priority: val });
            }}
            disabled={isUpdating}
          >
            {priorityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
             {(() => {
                const opt = priorityOptions.find(o => o.value === priority) || priorityOptions[0];
                const Icon = opt.icon;
                return <Icon size={14} className={opt.color} />;
             })()}
          </div>
        </div>
      </div>

      {/* Assignee */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-2">
          <User size={12} />
          Assignee
        </span>
        <div className="relative group min-w-[120px] max-w-[200px]">
          <select
            className="appearance-none bg-gray-50 border border-gray-100 rounded-md px-3 py-2 text-sm font-medium focus:outline-none pr-8 cursor-pointer w-full hover:bg-gray-100 transition-colors"
            value={assigneeId}
            onChange={(e) => {
              const val = e.target.value || null;
              if (val === reviewerId) {
                alert("Assignee cannot be the same as the reviewer");
                return;
              }
              setAssigneeId(val || '');
              handleUpdate({ assignee_id: val });
            }}
            disabled={isUpdating}
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 font-bold">
             <User size={14} />
          </div>
        </div>
      </div>

      {/* Reviewer */}
      <div className="flex flex-col gap-2 pt-6 border-t border-gray-50">
        <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-2">
          <CheckCircle2 size={12} />
          Reviewer
        </span>
        <div className="relative group min-w-[120px] max-w-[200px]">
          <select
            className="appearance-none bg-gray-50 border border-gray-100 rounded-md px-3 py-2 text-sm font-medium focus:outline-none pr-8 cursor-pointer w-full hover:bg-gray-100 transition-colors"
            value={reviewerId}
            onChange={(e) => {
              const val = e.target.value || null;
              if (val === assigneeId) {
                alert("Reviewer cannot be the same as the assignee");
                return;
              }
              setReviewerId(val || '');
              handleUpdate({ reviewer_id: val });
            }}
            disabled={isUpdating}
          >
            <option value="">No reviewer</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 font-bold">
             <CheckCircle2 size={14} />
          </div>
        </div>
      </div>
    </div>
  );
}
