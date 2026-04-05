'use client';

import { useState, useRef, useEffect, memo, useCallback } from 'react';
import { updateIssue } from '@/app/dashboard/issues/actions';
import { toast } from 'sonner';
import { 
    SignalHigh,
    SignalMedium,
    SignalLow,
    Signal,
    Minus,
    Loader2
} from 'lucide-react';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';

interface IssuePrioritySelectorProps {
    issueId: string;
    currentPriority: string;
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
    currentPriority
}: IssuePrioritySelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

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

    const handleSelect = useCallback(async (e: React.MouseEvent, value: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (value === currentPriority) {
            setIsOpen(false);
            return;
        }

        setIsOpen(false);
        setIsUpdating(true);
        const res = await updateIssue(issueId, { priority: value });
        if (res.error) {
            toast.error(res.error);
        }
        setIsUpdating(false);
        router.refresh();
    }, [issueId, currentPriority, router]);

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
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                disabled={isUpdating}
                className={clsx(
                    "flex items-center justify-center w-8 h-8 rounded-md transition-all hover:bg-gray-100",
                    isOpen && "bg-gray-100"
                )}
                title={`Priority: ${currentPriority}`}
            >
                {isUpdating ? (
                    <Loader2 size={12} className="animate-spin text-gray-400" />
                ) : (
                    renderPriorityIcon(currentPriority)
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute left-0 top-full mt-1 w-36 bg-white shadow-xl border border-gray-100 rounded-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                        {priorityOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={(e) => handleSelect(e, opt.value)}
                                className={clsx(
                                    "w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-gray-50",
                                    currentPriority === opt.value ? "bg-gray-50 text-indigo-600" : "text-gray-500"
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
