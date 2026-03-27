'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { updateProjectPriority } from '@/app/dashboard/actions';
import { AlertCircle, SignalHigh, SignalMedium, SignalLow, Ban } from 'lucide-react';

interface PrioritySelectorProps {
    projectId: string;
    currentPriority: string | null;
}

const priorities = [
    { value: null, label: 'No priority', shortcut: '0', icon: <Ban size={14} className="text-gray-400" /> },
    { value: 'urgent', label: 'Urgent', shortcut: '1', icon: <AlertCircle size={14} className="text-red-500 fill-red-500" /> },
    { value: 'high', label: 'High', shortcut: '2', icon: <SignalHigh size={14} className="text-orange-500" /> },
    { value: 'medium', label: 'Medium', shortcut: '3', icon: <SignalMedium size={14} className="text-gray-400" /> },
    { value: 'low', label: 'Low', shortcut: '4', icon: <SignalLow size={14} className="text-gray-400" /> },
];

export function PrioritySelector({ projectId, currentPriority }: PrioritySelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const dropdownRef = useRef<HTMLDivElement>(null);

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
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-200/50 transition-colors"
            >
                {renderTriggerIcon()}
            </button>

            {isOpen && (
                <div className="absolute top-10 -left-6 w-60 bg-[#252528] rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.3)] border border-[#3e3e42] py-2 z-50 text-white font-sans overflow-hidden">
                    <div className="px-3 pb-2 mb-2 border-b border-[#3e3e42]/50 text-xs text-gray-400">
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
                                    className="flex items-center justify-between px-3 py-1.5 hover:bg-[#343438] transition-colors w-full text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 flex justify-center">
                                            {p.icon}
                                        </div>
                                        <span className={`text-sm ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                            {p.label}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isSelected && (
                                            <span className="text-gray-400 text-xs text-[10px]">✓</span>
                                        )}
                                        <span className="text-gray-500 text-xs font-mono">{p.shortcut}</span>
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
