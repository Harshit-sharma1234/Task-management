'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { updateProjectStatus } from '@/app/dashboard/actions';
import { Circle, CircleDashed, CircleDot, Clock, Search, CheckCircle2, XCircle } from 'lucide-react';

interface StatusSelectorProps {
    projectId: string;
    currentStatus: string | null;
    align?: 'left' | 'right';
}

const statuses = [
    { value: 'backlog', label: 'Backlog', shortcut: 'B', color: 'border-gray-400', icon: <Circle size={14} className="text-gray-400" /> },
    { value: 'to_do', label: 'To Do', shortcut: 'T', color: 'border-blue-400', icon: <CircleDashed size={14} className="text-blue-400" /> },
    { value: 'in_progress', label: 'In Progress', shortcut: 'P', color: 'border-yellow-400', icon: <CircleDot size={14} className="text-yellow-400" /> },
    { value: 'review', label: 'Review', shortcut: 'R', color: 'border-orange-400', icon: <Clock size={14} className="text-orange-400" /> },
    { value: 'in_review', label: 'In Review', shortcut: 'I', color: 'border-purple-400', icon: <Search size={14} className="text-purple-400" /> },
    { value: 'done', label: 'Done', shortcut: 'D', color: 'border-green-400', icon: <CheckCircle2 size={14} className="text-green-400" /> },
    { value: 'cancelled', label: 'Cancelled', shortcut: 'C', color: 'border-red-400', icon: <XCircle size={14} className="text-red-400" /> },
];

export function StatusSelector({ 
    projectId, 
    currentStatus,
    align = 'left'
}: StatusSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const dropdownRef = useRef<HTMLDivElement>(null);

    const activeStatus = statuses.find(s => s.value === currentStatus) || statuses[0];

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

    const handleSelect = (value: string) => {
        if (value === currentStatus) {
            setIsOpen(false);
            return;
        }

        setIsOpen(false);
        startTransition(async () => {
            const res = await updateProjectStatus(projectId, value);
            if (res.error) {
                alert(res.error);
            }
        });
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded border border-gray-200/50 text-gray-600 hover:bg-gray-100 transition-colors"
                disabled={isPending}
            >
                {isPending ? (
                    <div className="w-2 h-2 rounded-full border border-gray-300 border-t-blue-500 animate-spin"></div>
                ) : (
                    <div className={`w-2 h-2 rounded-full border ${activeStatus.color}`}></div>
                )}
                <span className="text-xs">{activeStatus.label}</span>
            </button>

            {isOpen && (
                <div className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200`}>
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50 mb-1">
                        Change Status
                    </div>
                    
                    <div className="flex flex-col">
                        {statuses.map((s) => {
                            const isSelected = currentStatus === s.value || (!currentStatus && s.value === 'backlog');
                            
                            return (
                                <button
                                    key={s.value}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(s.value);
                                    }}
                                    className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 transition-colors w-full text-left group"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-4 flex justify-center text-gray-400 group-hover:text-gray-600">
                                            {s.icon}
                                        </div>
                                        <span className={`text-sm ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-600 group-hover:text-gray-900'}`}>
                                            {s.label}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isSelected && (
                                            <span className="text-blue-500 text-[10px]">✓</span>
                                        )}
                                        <span className="text-gray-300 text-[10px] font-mono group-hover:text-gray-400">{s.shortcut}</span>
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
