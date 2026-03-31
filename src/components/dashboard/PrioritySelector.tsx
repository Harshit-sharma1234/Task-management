'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { updateProjectPriority } from '@/app/dashboard/actions';
import { AlertCircle, SignalHigh, SignalMedium, SignalLow, Ban } from 'lucide-react';

interface PrioritySelectorProps {
    projectId: string;
    currentPriority: string | null;
    showLabel?: boolean;
    align?: 'left' | 'right';
}

const priorities = [
    { value: null, label: 'No priority', shortcut: '0', icon: <Ban size={14} className="text-gray-400" /> },
    { value: 'urgent', label: 'Urgent', shortcut: '1', icon: <AlertCircle size={14} className="text-red-500 fill-red-500" /> },
    { value: 'high', label: 'High', shortcut: '2', icon: <SignalHigh size={14} className="text-orange-500" /> },
    { value: 'medium', label: 'Medium', shortcut: '3', icon: <SignalMedium size={14} className="text-gray-400" /> },
    { value: 'low', label: 'Low', shortcut: '4', icon: <SignalLow size={14} className="text-gray-400" /> },
];

export function PrioritySelector({ 
    projectId, 
    currentPriority, 
    showLabel = false,
    align = 'left'
}: PrioritySelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const dropdownRef = useRef<HTMLDivElement>(null);

    const activePriority = priorities.find(p => p.value === currentPriority) || priorities[0];

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
    const handleSelect = (value: string | null) => {
        if (value === currentPriority && value !== null) {
            setIsOpen(false);
            return;
        }

        setIsOpen(false);
        startTransition(async () => {
            const res = await updateProjectPriority(projectId, value);
            if (res.error) {
                alert(res.error);
            }
        });
    };

    // Render the trigger icon (signal bars)
    const renderTriggerIcon = () => {
        if (isPending) return <div className="w-3 h-3 rounded-full border-2 border-gray-300 border-t-blue-500 animate-spin"></div>;

        if (currentPriority === 'urgent') return (
            <div className="flex gap-0.5 items-end h-3" title="Urgent">
                <div className="w-1 h-3 bg-red-500 rounded-sm"></div>
                <div className="w-1 h-3 bg-red-500 rounded-sm"></div>
                <div className="w-1 h-3 bg-red-500 rounded-sm"></div>
            </div>
        );
        if (currentPriority === 'high') return (
            <div className="flex gap-0.5 items-end h-3" title="High">
                <div className="w-1 h-2 bg-orange-500 rounded-sm"></div>
                <div className="w-1 h-2.5 bg-orange-500 rounded-sm"></div>
                <div className="w-1 h-3 bg-orange-500 rounded-sm"></div>
            </div>
        );
        if (currentPriority === 'medium') return (
            <div className="flex gap-0.5 items-end h-3" title="Medium">
                <div className="w-1 h-1.5 bg-gray-400 rounded-sm"></div>
                <div className="w-1 h-2.5 bg-gray-400 rounded-sm"></div>
                <div className="w-1 h-3 bg-gray-200 rounded-sm"></div>
            </div>
        );
        if (currentPriority === 'low') return (
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
                className={`flex items-center gap-2 py-1 rounded-md hover:bg-gray-100/80 transition-colors text-gray-500 hover:text-gray-900 ${isPending ? 'opacity-50' : ''}`}
            >
                {renderTriggerIcon()}
                {showLabel && (
                    <span className="text-sm font-medium text-gray-700">
                        {activePriority.label}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} top-full mt-2 w-60 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 text-gray-900 font-sans overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200`}>
                    <div className="px-3 pb-2 mb-2 border-b border-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        Change priority...
                    </div>
                    
                    <div className="flex flex-col">
                        {priorities.map((p) => {
                            const isSelected = currentPriority === p.value || (!currentPriority && p.value === null);
                            
                            return (
                                <button
                                    key={p.label}
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
                                            <span className="text-blue-500 text-[10px]">✓</span>
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
}
