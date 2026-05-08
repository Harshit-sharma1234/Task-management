'use client';

import { useState, useRef, useEffect, memo, useCallback, startTransition } from 'react';
import { updateIssue } from '@/app/dashboard/[workspace]/issues/actions';
import { useModalStore } from '@/lib/store/modal';
import { toast } from 'sonner';
import { 
    SignalHigh,
    SignalMedium,
    SignalLow,
    Signal,
    Minus,
    Loader2
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { generateIssueId } from '@/lib/utils/id';

interface IssuePrioritySelectorProps {
    issueId: string;
    currentPriority: string;
    currentUser?: any;
    assigneeId?: string | null;
    reviewerId?: string | null;
    projectName?: string;
    issueTitle?: string;
}

const priorityOptions = [
    { value: 'urgent', label: 'Urgent', icon: SignalHigh, color: 'text-red-500' },
    { value: 'high', label: 'High', icon: SignalHigh, color: 'text-red-400' },
    { value: 'medium', label: 'Medium', icon: SignalMedium, color: 'text-yellow-400' },
    { value: 'low', label: 'Low', icon: SignalLow, color: 'text-indigo-400' },
    { value: 'no_priority', label: 'No Priority', icon: Minus, color: 'text-gray-300' },
];

export const IssuePrioritySelector = memo(({
    issueId,
    currentPriority,
    currentUser,
    assigneeId,
    reviewerId,
    projectName,
    issueTitle
}: IssuePrioritySelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [optimisticPriority, setOptimisticPriority] = useState(currentPriority);
    const dropdownRef = useRef<HTMLDivElement>(null);


    const role = currentUser?.roles?.role_name;
    const isAdmin = role === 'Admin' || role === 'Project Manager';
    const isSrDev = role === 'Senior Developer';
    const isAssignee = currentUser?.id === assigneeId;
    const isReviewer = currentUser?.id === reviewerId;
    const canUpdate = isAdmin || isSrDev || isAssignee || isReviewer;

    const { activeContextMenu, setActiveContextMenu, activeTicket, optimisticTicketUpdates } = useModalStore();
    const optimisticUpdate = optimisticTicketUpdates[issueId];
    // Listen to global shortcut
    useEffect(() => {
        if (activeContextMenu === 'priority' && activeTicket?.id === issueId && canUpdate) {
            setIsOpen(true);
            setActiveContextMenu(null); // consume the event
        }
    }, [activeContextMenu, activeTicket, issueId, setActiveContextMenu, canUpdate]);
    useEffect(() => { 
        if (optimisticUpdate?.priority !== undefined) {
            setOptimisticPriority(optimisticUpdate.priority);
        } else if (activeTicket && activeTicket.id === issueId && activeTicket.priority) {
            setOptimisticPriority(activeTicket.priority);
        } else {
            setOptimisticPriority(currentPriority); 
        }
    }, [currentPriority, activeTicket, optimisticUpdate]);

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
        
        if (value === optimisticPriority) {
            setIsOpen(false);
            return;
        }

        const previousPriority = optimisticPriority;
        setOptimisticPriority(value);
        
        // Update global optimistic store
        const { setOptimisticTicketUpdate } = useModalStore.getState();
        setOptimisticTicketUpdate(issueId, { priority: value });

        setIsOpen(false);
        setIsUpdating(true);

        startTransition(async () => {
            const res = await updateIssue(issueId, { priority: value });
            if (res.error) {
                // Revert on failure
                setOptimisticPriority(previousPriority);
                useModalStore.getState().clearOptimisticTicketUpdate(issueId);
                toast.error(res.error);
            }
            setIsUpdating(false);
        });
    }, [issueId, optimisticPriority]);

    const renderPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return (
                    <div className="flex gap-0.5 items-end h-3">
                        <div className="w-1 h-3 bg-red-500 rounded-sm"></div>
                        <div className="w-1 h-3 bg-red-500 rounded-sm"></div>
                        <div className="w-1 h-3 bg-red-500 rounded-sm"></div>
                    </div>
                );
            case 'high':
                return (
                    <div className="flex gap-0.5 items-end h-3">
                        <div className="w-1 h-2 bg-red-400 rounded-sm"></div>
                        <div className="w-1 h-2.5 bg-red-400 rounded-sm"></div>
                        <div className="w-1 h-3 bg-red-400 rounded-sm"></div>
                    </div>
                );
            case 'medium':
                return (
                    <div className="flex gap-0.5 items-end h-3">
                        <div className="w-1 h-1.5 bg-yellow-400 rounded-sm"></div>
                        <div className="w-1 h-2.5 bg-yellow-400 rounded-sm"></div>
                        <div className="w-1 h-3 bg-yellow-100 rounded-sm"></div>
                    </div>
                );
            case 'low':
                return (
                    <div className="flex gap-0.5 items-end h-3">
                        <div className="w-1 h-1.5 bg-indigo-400 rounded-sm"></div>
                        <div className="w-1 h-3 bg-indigo-100 rounded-sm"></div>
                        <div className="w-1 h-3 bg-indigo-100 rounded-sm"></div>
                    </div>
                );
            default:
                return <div className="w-4 h-0.5 bg-gray-200 rounded-full"></div>;
        }
    };

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
                    "flex items-center justify-center w-8 h-8 rounded-md transition-all",
                    canUpdate ? "hover:bg-gray-100" : "cursor-not-allowed opacity-50",
                    isOpen && "bg-gray-100"
                )}
                title={`Priority: ${optimisticPriority}`}
            >
                {isUpdating ? (
                    <Loader2 size={12} className="animate-spin text-gray-400" />
                ) : (
                    renderPriorityIcon(optimisticPriority)
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute left-0 top-full mt-1 w-48 bg-white shadow-xl border border-gray-100 rounded-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="px-3 pt-1 pb-2 border-b border-gray-50 mb-1">
                            <div className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-0.5">
                                {generateIssueId(projectName, issueId)}
                            </div>
                            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate">
                                {issueTitle || 'Set Priority'}
                            </div>
                        </div>

                        {priorityOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={(e) => handleSelect(e, opt.value)}
                                className={twMerge(
                                    "w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-gray-50",
                                    optimisticPriority === opt.value ? "bg-gray-50 text-indigo-600" : "text-gray-500"
                                )}
                            >
                                <div className="w-4 flex justify-center">
                                    {renderPriorityIcon(opt.value)}
                                </div>
                                <span className="text-[11px] font-semibold flex-1">
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

IssuePrioritySelector.displayName = 'IssuePrioritySelector';
