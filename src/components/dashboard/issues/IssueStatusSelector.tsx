'use client';

import { useState, useRef, useEffect } from 'react';
import { updateIssue } from '@/app/dashboard/issues/actions';
import { 
    Circle, 
    CircleDot, 
    CheckCircle2, 
    X, 
    ChevronDown,
    Loader2
} from 'lucide-react';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';

interface IssueStatusSelectorProps {
    issueId: string;
    currentStatus: string;
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

export function IssueStatusSelector({
    issueId,
    currentStatus
}: IssueStatusSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [optimisticStatus, setOptimisticStatus] = useState(currentStatus);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

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

    const handleSelect = async (e: React.MouseEvent, value: string) => {
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

        const res = await updateIssue(issueId, { status: value });
        if (res.error) {
            setOptimisticStatus(previousStatus); // Rollback on error
            alert(res.error);
        }
        setIsUpdating(false);
        router.refresh();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                disabled={isUpdating}
                className={clsx(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all hover:bg-gray-100 group/status min-w-[100px]",
                    isOpen && "bg-gray-100"
                )}
            >
                {isUpdating ? (
                    <Loader2 size={10} className="animate-spin text-gray-400" />
                ) : (
                    <div className={clsx("w-2 h-2 rounded-full shrink-0", activeStatus.dot)}></div>
                )}
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-tight truncate group-hover/status:text-gray-600 transition-colors">
                    {activeStatus.label}
                </span>
                <ChevronDown size={10} className={clsx(
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
                                onClick={(e) => handleSelect(e, opt.value)}
                                className={clsx(
                                    "w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-gray-50",
                                    currentStatus === opt.value ? "bg-gray-50" : ""
                                )}
                            >
                                <div className={clsx("w-2 h-2 rounded-full", opt.dot)}></div>
                                <span className={clsx(
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
}
