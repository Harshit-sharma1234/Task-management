'use client';

import { useState, useRef, useEffect, memo, useCallback, startTransition, useMemo } from 'react';
import { updateIssue } from '@/app/dashboard/[workspace]/issues/actions';
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
import { useModalStore } from '@/lib/store/modal';
import { generateIssueId } from '@/lib/utils/id';

interface IssueStatusSelectorProps {
    issueId: string;
    currentStatus: string;
    currentUser?: any;
    assigneeId?: string | null;
    reviewerId?: string | null;
    hideLabel?: boolean;
    projectName?: string;
    issueTitle?: string;
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
    reviewerId,
    hideLabel = false,
    projectName,
    issueTitle
}: IssueStatusSelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [optimisticStatus, setOptimisticStatus] = useState(currentStatus);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const { activeContextMenu, setActiveContextMenu, activeTicket, optimisticTicketUpdates } = useModalStore();
    const optimisticUpdate = optimisticTicketUpdates[issueId];

    // Safety checks for roles
    const roleData = currentUser?.roles;
    const role = (Array.isArray(roleData) ? roleData[0]?.role_name : roleData?.role_name) || '';
    
    const isAdmin = role === 'Admin' || role === 'Project Manager';
    const isAssignee = currentUser?.id === assigneeId;
    const isReviewer = currentUser?.id === reviewerId;
    const canUpdate = isAdmin || isAssignee || isReviewer;

    // Listen to global shortcut
    useEffect(() => {
        if (activeContextMenu === 'status' && activeTicket?.id === issueId && canUpdate) {
            setIsOpen(true);
            setActiveContextMenu(null); // consume the event
        }
    }, [activeContextMenu, activeTicket, issueId, setActiveContextMenu, canUpdate]);

    const isRestrictedUser = !isAdmin && !isReviewer;
    const restrictedStatuses = ['review', 'in_review', 'done'];

    const availableOptions = useMemo(() => {
        if (!isRestrictedUser) return statusOptions;
        return statusOptions.filter(opt => !restrictedStatuses.includes(opt.value));
    }, [isRestrictedUser]);

    useEffect(() => { 
        if (optimisticUpdate?.status !== undefined) {
            setOptimisticStatus(optimisticUpdate.status);
        } else if (activeTicket && activeTicket.id === issueId && activeTicket.status) {
            setOptimisticStatus(activeTicket.status);
        } else {
            setOptimisticStatus(currentStatus); 
        }
    }, [currentStatus, activeTicket, optimisticUpdate, issueId]);

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

        if (isRestrictedUser && restrictedStatuses.includes(value)) {
            toast.error("Only the Reviewer, Admin, or Project Manager can move issues to this status.");
            return;
        }
        
        if (value === optimisticStatus) {
            setIsOpen(false);
            return;
        }

        const previousStatus = optimisticStatus;
        setOptimisticStatus(value);
        
        // Update global optimistic store
        const { setOptimisticTicketUpdate } = useModalStore.getState();
        setOptimisticTicketUpdate(issueId, { status: value });

        setIsOpen(false);
        setIsUpdating(true);

        startTransition(async () => {
            const res = await updateIssue(issueId, { status: value });
            if (res.error) {
                setOptimisticStatus(previousStatus);
                useModalStore.getState().clearOptimisticTicketUpdate(issueId);
                toast.error(res.error);
            }
            setIsUpdating(false);
        });
    }, [issueId, optimisticStatus, isRestrictedUser]);

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                type="button"
                onClick={(e) => {
                    if (!canUpdate) return;
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                disabled={isUpdating || !canUpdate}
                className={twMerge(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all",
                    hideLabel ? "min-w-0 px-1" : "min-w-[100px]",
                    canUpdate ? "hover:bg-gray-100 group/status" : "cursor-not-allowed opacity-70",
                    isOpen && "bg-gray-100"
                )}
            >
                {isUpdating ? (
                    <Loader2 size={10} className="animate-spin text-gray-400" />
                ) : (
                    <div className={twMerge("w-2 h-2 rounded-full shrink-0", activeStatus.dot)}></div>
                )}
                {!hideLabel && (
                  <>
                    <span className="text-[10px] font-bold uppercase text-gray-400 tracking-tight truncate group-hover/status:text-gray-600 transition-colors">
                        {activeStatus.label}
                    </span>
                    <ChevronDown size={10} className={twMerge(
                        "text-gray-300 group-hover/status:text-gray-500 transition-transform duration-200",
                        isOpen && "rotate-180"
                    )} />
                  </>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute left-0 top-full mt-2 w-52 bg-white/90 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-slate-200/50 rounded-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-3.5 pt-1 pb-2.5 border-b border-slate-100/50 mb-1.5">
                            <div className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.15em] mb-1">
                                {generateIssueId(projectName, issueId)}
                            </div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-tight truncate leading-none">
                                {issueTitle || 'Set Status'}
                            </div>
                        </div>

                        {availableOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={(e) => handleSelect(e, opt.value)}
                                className={twMerge(
                                    "w-full flex items-center justify-between px-3.5 py-1.5 transition-all group/opt",
                                    optimisticStatus === opt.value ? "bg-indigo-50/50" : "hover:bg-slate-50/80"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={twMerge("w-2 h-2 rounded-full shrink-0 ring-2 ring-white shadow-sm", opt.dot)}></div>
                                    <span className={twMerge(
                                        "text-xs tracking-tight transition-colors",
                                        optimisticStatus === opt.value ? "text-indigo-600 font-bold" : "text-slate-600 group-hover/opt:text-slate-900 font-medium"
                                    )}>
                                        {opt.label}
                                    </span>
                                </div>
                                {optimisticStatus === opt.value && (
                                    <div className="w-1 h-1 rounded-full bg-indigo-500" />
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
});

IssueStatusSelector.displayName = 'IssueStatusSelector';
