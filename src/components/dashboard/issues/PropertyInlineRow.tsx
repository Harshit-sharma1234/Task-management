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
  User,
  FolderKanban
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
  users: { id: string, name: string }[];
  currentUserId: string;
  reviewerId: string | null;
}

export function PropertyInlineRow({ 
  ticketId, 
  initialStatus, 
  initialPriority, 
  initialAssigneeId,
  projectName,
  users,
  currentUserId,
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
      alert(result.error || 'Failed to update issue');
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
      <div className="relative group">
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          <StatusIcon size={14} className={currentStatusOpt.color} />
        </div>
        <select
          className="appearance-none bg-white border border-gray-200 rounded-md pl-8 pr-3 py-1.5 text-[11px] font-bold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all focus:outline-none cursor-pointer shadow-sm disabled:opacity-50"
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
                disabled={opt.value === 'done' && currentUserId !== reviewerId}
            >
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Priority Selector */}
      <div className="relative group">
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          <PriorityIcon size={14} className={currentPriorityOpt.color} />
        </div>
        <select
          className="appearance-none bg-white border border-gray-200 rounded-md pl-8 pr-3 py-1.5 text-[11px] font-bold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all focus:outline-none cursor-pointer shadow-sm disabled:opacity-50"
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
      </div>

      {/* Assignee Selector */}
      <div className="relative group">
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
           {assigneeId ? (
               <div className="w-4 h-4 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[8px] font-bold text-indigo-600">
                   {users.find(u => u.id === assigneeId)?.name.substring(0, 1) || 'U'}
               </div>
           ) : (
               <User size={14} className="text-gray-400" />
           )}
        </div>
        <select
          className="appearance-none bg-white border border-gray-200 rounded-md pl-8 pr-3 py-1.5 text-[11px] font-bold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all focus:outline-none cursor-pointer shadow-sm disabled:opacity-50 min-w-[110px]"
          value={assigneeId}
          onChange={(e) => {
            const val = e.target.value || null;
            if (val && val === reviewerId) {
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
      </div>

      {/* Project (Read Only link) */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50/50 border border-gray-100 rounded-md text-[11px] font-bold text-gray-500 shadow-sm border-dashed">
        <FolderKanban size={14} className="text-indigo-400" />
        <span className="truncate max-w-[120px] tracking-tight">{projectName}</span>
      </div>
    </div>
  );
}
