'use client';

import { useState, useRef, useEffect, useTransition, useMemo, useCallback, memo, forwardRef, useImperativeHandle } from 'react';
import { updateProjectLead } from '@/app/dashboard/actions';
import { User as UserIcon, Search, Check } from 'lucide-react';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { getInitials, getBadgeColor } from '@/lib/avatar';
import { useGlobalStore } from '@/lib/store/global';

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
    showName?: boolean;
    hideAvatar?: boolean;
    align?: 'left' | 'right';
    fallbackUser?: {
        id: string;
        name: string;
        avatar_url?: string | null;
    } | null;
}

// Re-export for backward compatibility with any external consumers
export { getBadgeColor, getInitials };

import { SelectorHandle } from './StatusSelector';

export const LeadSelector = memo(forwardRef<SelectorHandle, LeadSelectorProps>(({
    projectId,
    currentLeadId,
    users,
    showEmail = false,
    showName = false,
    hideAvatar = false,
    align = 'left',
    fallbackUser = null
}, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isPending, startTransition] = useTransition();
    const dropdownRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
        toggle: () => setIsOpen(prev => !prev),
    }));

    // Filter users based on search
    const filteredUsers = useMemo(() => {
        return users.filter(user =>
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [users, searchQuery]);

    // Current lead processing
    const currentLead = useMemo(() => {
        return users.find(u => u.id === currentLeadId) || (fallbackUser?.id === currentLeadId ? fallbackUser : null);
    }, [users, currentLeadId, fallbackUser]);

    const leadLabel = currentLead 
        ? (showEmail ? (currentLead as any).email || currentLead.name : currentLead.name) 
        : (currentLeadId ? 'Unknown Lead' : 'Unassigned');

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
    const handleSelect = useCallback((leadId: string | null) => {
        if (leadId === currentLeadId || !leadId) {
            setIsOpen(false);
            return;
        }

        setIsOpen(false);
        // Optimistic update: update both lead_id and the lead object for instant name change
        const selectedUser = users.find(u => u.id === leadId);
        useGlobalStore.getState().updateProject({ 
            id: projectId, 
            lead_id: leadId,
            lead: selectedUser ? {
                id: selectedUser.id,
                name: selectedUser.name,
                avatar_url: selectedUser.avatar_url
            } : null
        });

        startTransition(async () => {
            const res = await updateProjectLead(projectId, leadId);
            if (res.error) {
                // Revert on failure
                useGlobalStore.getState().updateProject({ id: projectId, lead_id: currentLeadId });
                toast.error(res.error);
            }
        });
    }, [projectId, currentLeadId]);

    return (
        <div className="relative flex items-center" ref={dropdownRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={`flex items-center gap-2 py-1 rounded-md hover:bg-gray-100/80 transition-colors text-gray-500 hover:text-gray-900 ${isPending ? 'opacity-50' : ''}`}
            >
                {!hideAvatar && (
                    <UserAvatar
                        name={currentLead ? currentLead.name : (currentLeadId ? '?' : 'Unassigned')}
                        avatarUrl={currentLead?.avatar_url}
                        size="sm"
                        className="ring-2 ring-white shadow-sm"
                    />
                )}
                <span className="text-[11px] font-bold text-gray-700 group-hover:text-indigo-600 transition-colors bg-gray-50 px-2 py-0.5 rounded border border-gray-100/80 group-hover:bg-gray-100/50 truncate max-w-[130px]">
                    {leadLabel}
                </span>
            </button>

            {isOpen && (
                <div className={`absolute ${align === 'left' ? 'left-auto right-0 sm:left-0 sm:right-auto' : 'right-0'} top-full mt-2 w-52 sm:w-64 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200`}>
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

                        {filteredUsers.length === 0 && searchQuery && (
                            <div className="p-3 text-center text-xs text-gray-400">No users found</div>
                        )}

                        {filteredUsers.map((u) => {
                            const isSelected = currentLeadId === u.id;

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
                                        <UserAvatar
                                            name={u.name}
                                            avatarUrl={u.avatar_url}
                                            size="sm"
                                        />
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
}))

LeadSelector.displayName = 'LeadSelector';
