'use client';

import { useState, useRef, useEffect, useTransition, memo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { updateProjectPriority } from '@/app/dashboard/actions';
import { toast } from 'sonner';
import { Ban } from 'lucide-react';
import { useGlobalStore } from '@/lib/store/global';
import { useModalStore } from '@/lib/store/modal';
import { SelectorHandle } from './StatusSelector';
import { generateShortId } from '@/lib/utils/id';

interface PrioritySelectorProps {
    projectId: string;
    currentPriority: string | null;
    showLabel?: boolean;
    align?: 'left' | 'right';
}

const priorities = [
    {
        value: 'urgent', label: 'Urgent', shortcut: '1', icon: (
            <div className="flex gap-0.5 items-end h-3">
                <div className="w-1 h-3 bg-red-500 rounded-sm"></div>
                <div className="w-1 h-3 bg-red-500 rounded-sm"></div>
                <div className="w-1 h-3 bg-red-500 rounded-sm"></div>
            </div>
        )
    },
    {
        value: 'high', label: 'High', shortcut: '2', icon: (
            <div className="flex gap-0.5 items-end h-3">
                <div className="w-1 h-2 bg-red-400 rounded-sm"></div>
                <div className="w-1 h-2.5 bg-red-400 rounded-sm"></div>
                <div className="w-1 h-3 bg-red-400 rounded-sm"></div>
            </div>
        )
    },
    {
        value: 'medium', label: 'Medium', shortcut: '3', icon: (
            <div className="flex gap-0.5 items-end h-3">
                <div className="w-1 h-1.5 bg-yellow-400 rounded-sm"></div>
                <div className="w-1 h-2.5 bg-yellow-400 rounded-sm"></div>
                <div className="w-1 h-3 bg-yellow-100 rounded-sm"></div>
            </div>
        )
    },
    {
        value: 'low', label: 'Low', shortcut: '4', icon: (
            <div className="flex gap-0.5 items-end h-3">
                <div className="w-1 h-1.5 bg-indigo-400 rounded-sm"></div>
                <div className="w-1 h-3 bg-indigo-100 rounded-sm"></div>
                <div className="w-1 h-3 bg-indigo-100 rounded-sm"></div>
            </div>
        )
    },
    { value: null, label: 'No priority', shortcut: '0', icon: <Ban size={14} className="text-gray-400" /> },
];

export const PrioritySelector = memo(forwardRef<SelectorHandle, PrioritySelectorProps>(({
    projectId,
    currentPriority,
    showLabel = false,
    align = 'left'
}, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [optimisticPriority, setOptimisticPriority] = useState(currentPriority);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const globalProject = useGlobalStore(state => state.projects.find(p => p.id === projectId));

    const { optimisticProjectUpdates } = useModalStore();
    const optimisticUpdate = optimisticProjectUpdates[projectId];

    // Sync with global store first, fallback to props
    useEffect(() => { 
        if (optimisticUpdate?.priority !== undefined) {
            setOptimisticPriority(optimisticUpdate.priority);
        } else if (globalProject && globalProject.priority !== undefined) {
            setOptimisticPriority(globalProject.priority);
        } else {
            setOptimisticPriority(currentPriority); 
        }
    }, [currentPriority, globalProject, optimisticUpdate]);

    useImperativeHandle(ref, () => ({
        toggle: () => setIsOpen(prev => !prev),
    }));

    const activePriority = priorities.find(p => p.value === optimisticPriority) || priorities[0];

    // Click outside logic
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

    // Handle priority selection
    const handleSelect = useCallback((value: string | null) => {
        if (value === optimisticPriority && value !== null) {
            setIsOpen(false);
            return;
        }

        // Optimistic: instantly update the UI
        const previousPriority = optimisticPriority;
        setOptimisticPriority(value);
        useGlobalStore.getState().updateProject({ id: projectId, priority: value });
        
        // Update global optimistic store
        const { setOptimisticProjectUpdate } = useModalStore.getState();
        setOptimisticProjectUpdate(projectId, { priority: value });
        
        setIsOpen(false);

        startTransition(async () => {
            const res = await updateProjectPriority(projectId, value);
            if (res.error) {
                // Revert on failure
                setOptimisticPriority(previousPriority);
                useModalStore.getState().clearOptimisticProjectUpdate(projectId);
                useGlobalStore.getState().updateProject({ id: projectId, priority: previousPriority });
                toast.error(res.error);
            }
        });
    }, [projectId, optimisticPriority]);

    // Render the trigger icon (signal bars)
    const renderTriggerIcon = () => {
        if (optimisticPriority === 'urgent') return (
            <div className="flex gap-0.5 items-end h-3" title="Urgent">
                <div className="w-1 h-3 bg-red-500 rounded-sm"></div>
                <div className="w-1 h-3 bg-red-500 rounded-sm"></div>
                <div className="w-1 h-3 bg-red-500 rounded-sm"></div>
            </div>
        );
        if (optimisticPriority === 'high') return (
            <div className="flex gap-0.5 items-end h-3" title="High">
                <div className="w-1 h-2 bg-orange-500 rounded-sm"></div>
                <div className="w-1 h-2.5 bg-orange-500 rounded-sm"></div>
                <div className="w-1 h-3 bg-orange-500 rounded-sm"></div>
            </div>
        );
        if (optimisticPriority === 'medium') return (
            <div className="flex gap-0.5 items-end h-3" title="Medium">
                <div className="w-1 h-1.5 bg-gray-400 rounded-sm"></div>
                <div className="w-1 h-2.5 bg-gray-400 rounded-sm"></div>
                <div className="w-1 h-3 bg-gray-200 rounded-sm"></div>
            </div>
        );
        if (optimisticPriority === 'low') return (
            <div className="flex gap-0.5 items-end h-3" title="Low">
                <div className="w-1 h-1.5 bg-gray-400 rounded-sm"></div>
                <div className="w-1 h-3 bg-gray-200 rounded-sm"></div>
                <div className="w-1 h-3 bg-gray-200 rounded-sm"></div>
            </div>
        );
        return <span className="text-gray-300">---</span>;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="flex items-center gap-2 py-1 rounded-md hover:bg-gray-100/80 transition-colors text-gray-500 hover:text-gray-900"
            >
                {renderTriggerIcon()}
                {showLabel && (
                    <span className="text-sm font-medium text-gray-700">
                        {activePriority.label}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className={`absolute ${align === 'left' ? 'left-[-40px] sm:left-0' : 'right-0'} top-full mt-2 w-60 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-[80] text-gray-900 font-sans overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200`}>
                    <div className="px-3 pb-2 mb-2 border-b border-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        Change priority...
                    </div>

                    <div className="flex flex-col">
                        {priorities.map((p) => {
                            const isSelected = optimisticPriority === p.value || (!optimisticPriority && p.value === null);

                            return (
                                <button
                                    key={String(p.label)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(p.value);
                                    }}
                                    className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 transition-colors w-full text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 flex justify-center">
                                            {p.icon}
                                        </div>
                                        <span className={`text-sm ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-600 group-hover:text-gray-900'}`}>
                                            {p.label}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isSelected && (
                                            <span className="text-indigo-500 text-[10px]">✓</span>
                                        )}
                                        <span className="text-gray-300 text-[10px] font-mono group-hover:text-gray-400">{p.shortcut}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}));

PrioritySelector.displayName = 'PrioritySelector';
