'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { updateProjectLead } from '@/app/dashboard/actions';
import { User as UserIcon, Search, Check } from 'lucide-react';
import Image from 'next/image';

interface User {
    id: string;
    name: string;
    email: string;
    avatar_url?: string | null;
}

interface LeadSelectorProps {
    projectId: string;
    currentLeadId: string | null;
    users: User[];
    showEmail?: boolean;
    align?: 'left' | 'right';
}

export const getBadgeColor = (name: string) => {
    if (name === 'Unassigned' || name === '?') return 'bg-gray-200 text-gray-500'
    const colors = [
        'bg-gradient-to-br from-orange-400 to-orange-500', 
        'bg-gradient-to-br from-indigo-400 to-indigo-500', 
        'bg-gradient-to-br from-emerald-400 to-emerald-500', 
        'bg-gradient-to-br from-purple-400 to-purple-500', 
        'bg-gradient-to-br from-pink-400 to-pink-500'
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return `${colors[Math.abs(hash) % colors.length]} text-white`
}

export const getInitials = (name: string) => {
    if (name === 'Unassigned' || name === '?') return '?'
    return name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
}

export function LeadSelector({ 
    projectId, 
    currentLeadId, 
    users, 
    showEmail = false,
    align = 'left'
}: LeadSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isPending, startTransition] = useTransition();
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Filter users based on search
    const filteredUsers = users.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Current lead processing
    const currentLead = users.find(u => u.id === currentLeadId);
    const leadLabel = currentLead ? (showEmail ? currentLead.email : currentLead.name) : 'Unassigned';
    const initials = getInitials(currentLead ? currentLead.name : 'Unassigned');

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
                className={`flex items-center gap-2 py-1 rounded-md hover:bg-gray-100/80 transition-colors text-gray-500 hover:text-gray-900 ${isPending ? 'opacity-50' : ''}`}
            >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border border-white shadow-sm ${currentLead?.avatar_url ? 'bg-gray-100 text-transparent' : getBadgeColor(currentLead ? currentLead.name : 'Unassigned')}`}>
                    {currentLead?.avatar_url ? (
                        <Image 
                            src={currentLead.avatar_url} 
                            alt={currentLead.name || 'Lead avatar'} 
                            width={24} 
                            height={24} 
                            className="rounded-full object-cover w-full h-full"
                            unoptimized={currentLead.avatar_url.includes('googleusercontent.com') || currentLead.avatar_url.includes('githubusercontent.com')}
                        />
                    ) : (
                        initials
                    )}
                </div>
                {showEmail && (
                    <span className="text-[11px] font-medium text-gray-700 truncate max-w-[200px]">
                        {leadLabel}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} top-full mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200`}>
                    <div className="p-2 border-b border-gray-50 flex items-center gap-2 bg-gray-50/50">
                        <Search size={14} className="text-gray-400 ml-2" />
                        <input 
                            type="text"
                            placeholder="Assign lead..."
                            className="w-full bg-transparent border-none outline-none text-xs py-1"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                    
                    <div className="flex flex-col max-h-64 overflow-y-auto p-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSelect(null);
                            }}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors w-full text-left group"
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                                    <UserIcon size={12} />
                                </div>
                                <span className={`text-xs font-semibold ${!currentLeadId ? 'text-gray-900' : 'text-gray-600'}`}>
                                    Unassigned
                                </span>
                            </div>
                            {!currentLeadId && <Check size={14} className="text-indigo-600" />}
                        </button>

                        {filteredUsers.length === 0 && searchQuery && (
                            <div className="p-3 text-center text-xs text-gray-400">No users found</div>
                        )}

                        {filteredUsers.map((u) => {
                            const isSelected = currentLeadId === u.id;
                            const uInitials = getInitials(u.name);
                            
                            return (
                                <button
                                    key={u.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(u.id);
                                    }}
                                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm border border-gray-100 overflow-hidden ${!u.avatar_url ? getBadgeColor(u.name) : 'bg-gray-100 text-transparent'}`}>
                                            {u.avatar_url ? (
                                                <Image 
                                                    src={u.avatar_url} 
                                                    alt={u.name || 'User avatar'} 
                                                    width={24} 
                                                    height={24} 
                                                    className="w-full h-full object-cover"
                                                    unoptimized={u.avatar_url.includes('googleusercontent.com') || u.avatar_url.includes('githubusercontent.com')}
                                                />
                                            ) : (
                                                uInitials
                                            )}
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-xs font-semibold text-gray-900 truncate">
                                                {u.email}
                                            </span>
                                            <span className="text-[10px] text-gray-500 truncate">
                                                {u.name}
                                            </span>
                                        </div>
                                    </div>
                                    {isSelected && <Check size={14} className="text-indigo-600 shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
