'use client';

import { useState, useRef, useEffect, memo, useCallback, startTransition } from 'react';
import { updateIssue } from '@/app/dashboard/issues/actions';
import { toast } from 'sonner';
import { 
    Circle, 
    CircleDot, 
    CheckCircle2, 
    X, 
    ChevronDown,
    Loader2
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface IssueStatusSelectorProps {
    issueId: string;
    currentStatus: string;
    currentUser?: any;
    assigneeId?: string | null;
    reviewerId?: string | null;
}

const statusOptions = [
    { value: 'backlog', label: 'Backlog', icon: CircleDot, color: 'text-gray-400', dot: 'bg-gray-400' },
    { value: 'to_do', label: 'Todo', icon: Circle, color: 'text-orange-400', dot: 'bg-orange-400' },
    { value: 'in_progress', label: 'In Progress', icon: CircleDot, color: 'text-indigo-500', dot: 'bg-indigo-500' },
    { value: 'review', label: 'Review', icon: CircleDot, color: 'text-fuchsia-400', dot: 'bg-fuchsia-400' },
    { value: 'in_review', label: 'In Review', icon: CircleDot, color: 'text-purple-500', dot: 'bg-purple-500' },
    { value: 'done', label: 'Done', icon: CheckCircle2, color: 'text-green-500', dot: 'bg-green-500' },
    { value: 'cancelled', label: 'Cancelled', icon: X, color: 'text-red-500', dot: 'bg-red-500' },
];

export const IssueStatusSelector = memo(({
    issueId,
    currentStatus,
    currentUser,
    assigneeId,
    reviewerId
}: IssueStatusSelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [optimisticStatus, setOptimisticStatus] = useState(currentStatus);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const role = currentUser?.roles?.role_name;
    const isOwner = currentUser?.id === assigneeId || currentUser?.id === reviewerId;
    const isAdmin = role === 'Admin' || role === 'Project Manager';
    const canUpdate = isAdmin || isOwner;

    // Restricted statuses for assignees (cannot move to in_review or done)
    const isRestrictedAssignee = currentUser?.id === assigneeId && !isAdmin;
    const restrictedStatuses = ['in_review', 'done'];

    // Sync with server props when they arrive
    useEffect(() => { setOptimisticStatus(currentStatus); }, [currentStatus]);

    const activeStatus = statusOptions.find(s => s.value === optimisticStatus) || statusOptions[1];

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleSelect = useCallback((e: React.MouseEvent, value: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (value === optimisticStatus) {
            setIsOpen(false);
            return;
        }

        // Optimistic: instantly update the UI
        const previousStatus = optimisticStatus;
        setOptimisticStatus(value);
        setIsOpen(false);
        setIsUpdating(true);

        startTransition(async () => {
            const res = await updateIssue(issueId, { status: value });
            if (res.error) {
                // Revert on failure
                setOptimisticStatus(previousStatus);
                toast.error(res.error);
            }
            setIsUpdating(false);
            // No router.refresh() — revalidatePath in the server action already handles revalidation
        });
    }, [issueId, optimisticStatus]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={(e) => {
                    if (!canUpdate) return;
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                disabled={isUpdating || !canUpdate}
                className={twMerge(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all min-w-[100px]",
                    canUpdate ? "hover:bg-gray-100 group/status" : "cursor-not-allowed opacity-70",
                    isOpen && "bg-gray-100"
                )}
            >
                {isUpdating ? (
                    <Loader2 size={10} className="animate-spin text-gray-400" />
                ) : (
                    <div className={twMerge("w-2 h-2 rounded-full shrink-0", activeStatus.dot)}></div>
                )}
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-tight truncate group-hover/status:text-gray-600 transition-colors">
                    {activeStatus.label}
                </span>
                <ChevronDown size={10} className={twMerge(
                    "text-gray-300 group-hover/status:text-gray-500 transition-transform duration-200",
                    isOpen && "rotate-180"
                )} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute left-0 top-full mt-1 w-40 bg-white shadow-xl border border-gray-100 rounded-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                        {statusOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={(e) => {
                                    if (isRestrictedAssignee && restrictedStatuses.includes(opt.value)) {
                                        toast.error(`Assignees cannot move issues to ${opt.label}`);
                                        return;
                                    }
                                    handleSelect(e, opt.value);
                                }}
                                className={twMerge(
                                    "w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors",
                                    currentStatus === opt.value ? "bg-gray-50" : "hover:bg-gray-50",
                                    isRestrictedAssignee && restrictedStatuses.includes(opt.value) && "opacity-40 cursor-not-allowed grayscale"
                                )}
                            >
                                <div className={twMerge("w-2 h-2 rounded-full", opt.dot)}></div>
                                <span className={twMerge(
                                    "text-[11px] font-semibold",
                                    currentStatus === opt.value ? "text-gray-900" : "text-gray-500"
                                )}>
                                    {opt.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
})

IssueStatusSelector.displayName = 'IssueStatusSelector';
