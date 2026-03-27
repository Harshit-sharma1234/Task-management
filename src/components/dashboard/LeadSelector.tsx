'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { updateProjectLead } from '@/app/dashboard/actions';
import { User as UserIcon } from 'lucide-react';

interface User {
    id: string;
    name: string;
}

interface LeadSelectorProps {
    projectId: string;
    currentLeadId: string | null;
    users: User[];
}

export const getBadgeColor = (name: string) => {
    if (name === 'Unassigned' || name === '?') return 'bg-gray-200 text-gray-500'
    const colors = ['bg-orange-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-pink-500']
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return `${colors[Math.abs(hash) % colors.length]} text-white`
}

export const getInitials = (name: string) => {
    if (name === 'Unassigned' || name === '?') return '?'
    return name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
}

export function LeadSelector({ projectId, currentLeadId, users }: LeadSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Current lead processing
    const currentLead = users.find(u => u.id === currentLeadId);
    const leadName = currentLead ? currentLead.name : 'Unassigned';
    const initials = getInitials(leadName);

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

    // Handle lead selection
    const handleSelect = (leadId: string | null) => {
        if (leadId === currentLeadId) {
            setIsOpen(false);
            return;
        }

        setIsOpen(false);
        startTransition(async () => {
            const res = await updateProjectLead(projectId, leadId);
            if (res.error) {
                alert(res.error);
            }
        });
    };

    return (
        <div className="relative flex items-center" ref={dropdownRef}>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm hover:ring-2 hover:ring-gray-200 transition-all ${getBadgeColor(leadName)} ${isPending ? 'opacity-50' : ''}`}
            >
                {initials}
            </button>

            {isOpen && (
                <div className="absolute top-8 left-0 w-56 bg-[#252528] rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.3)] border border-[#3e3e42] py-2 z-50 text-white font-sans overflow-hidden">
                    <div className="px-3 pb-2 mb-2 border-b border-[#3e3e42]/50 text-xs text-gray-400">
                        Assign lead...
                    </div>
                    
                    <div className="flex flex-col max-h-64 overflow-y-auto">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSelect(null);
                            }}
                            className="flex items-center justify-between px-3 py-1.5 hover:bg-[#343438] transition-colors w-full text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 rounded-full bg-[#1c1c1f] border border-[#3e3e42] flex items-center justify-center text-gray-500 shrink-0">
                                    <UserIcon size={10} />
                                </div>
                                <span className={`text-sm ${!currentLeadId ? 'text-white' : 'text-gray-300'}`}>
                                    Unassigned
                                </span>
                            </div>
                            {!currentLeadId && <span className="text-gray-400 text-[10px]">✓</span>}
                        </button>

                        {users.map((u) => {
                            const isSelected = currentLeadId === u.id;
                            const uInitials = getInitials(u.name);
                            
                            return (
                                <button
                                    key={u.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(u.id);
                                    }}
                                    className="flex items-center justify-between px-3 py-1.5 hover:bg-[#343438] transition-colors w-full text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${getBadgeColor(u.name)}`}>
                                            {uInitials}
                                        </div>
                                        <span className={`text-sm truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                            {u.name}
                                        </span>
                                    </div>
                                    {isSelected && <span className="text-gray-400 text-[10px]">✓</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
