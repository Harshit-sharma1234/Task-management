'use client';

import { useState, useRef, useEffect, useMemo, useCallback, memo, startTransition } from 'react';
import { updateIssue } from '@/app/dashboard/[workspace]/issues/actions';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Search, Loader2, User } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface IssueAssigneeSelectorProps {
    issueId: string;
    currentAssigneeId: string | null;
    currentAssignee: { name: string, avatar_url?: string | null } | null;
    users: { id: string, name: string, email?: string, avatar_url?: string | null }[];
    currentUser?: any;
    reviewerId?: string | null;
}

export const IssueAssigneeSelector = memo(({
    issueId,
    currentAssigneeId,
    currentAssignee,
    users,
    currentUser,
    reviewerId
}: IssueAssigneeSelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [search, setSearch] = useState('');
    const [optimisticAssigneeId, setOptimisticAssigneeId] = useState(currentAssigneeId);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);


    const role = currentUser?.roles?.role_name;
    const isAdmin = role === 'Admin' || role === 'Project Manager';
    const isSrDev = role === 'Senior Developer';
    const isAssignee = currentUser?.id === currentAssigneeId;
    const isReviewer = currentUser?.id === reviewerId;
    const canUpdate = isAdmin || isSrDev || isAssignee || isReviewer;

    const optimisticAssignee = useMemo(() => 
        users.find(u => u.id === optimisticAssigneeId) || null
    , [users, optimisticAssigneeId]);

    const filteredUsers = useMemo(() => {
        return (users || []).filter(u => 
            (u.name || '').toLowerCase().includes(search.toLowerCase())
        );
    }, [users, search]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            setTimeout(() => inputRef.current?.focus(), 10);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleSelect = useCallback((e: React.MouseEvent, userId: string | null) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (userId === optimisticAssigneeId) {
            setIsOpen(false);
            return;
        }

        const previousAssigneeId = optimisticAssigneeId;
        setOptimisticAssigneeId(userId);
        setIsOpen(false);
        setIsUpdating(true);
        
        startTransition(async () => {
            const res = await updateIssue(issueId, { assignee_id: userId });
            if (res.error) {
                // Revert on failure
                setOptimisticAssigneeId(previousAssigneeId);
                toast.error(res.error);
            }
            setIsUpdating(false);
        });
    }, [issueId, optimisticAssigneeId]);

    return (
        <div className="relative group/assignee" ref={dropdownRef}>
            <button
                onClick={(e) => {
                    if (!canUpdate) return;
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                disabled={isUpdating || !canUpdate}
                className={twMerge(
                    "relative flex items-center transition-all",
                    canUpdate ? "hover:scale-110" : "cursor-not-allowed",
                    isUpdating && "opacity-50"
                )}
            >
                <div className="relative">
                    <UserAvatar
                        name={optimisticAssignee?.name || 'Unassigned'}
                        avatarUrl={optimisticAssignee?.avatar_url}
                        size="sm"
                    />
                    {isUpdating && (
                        <div className="absolute inset-0 bg-white/60 rounded-full flex items-center justify-center">
                            <Loader2 size={10} className="animate-spin text-indigo-600" />
                        </div>
                    )}
                </div>
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-64 bg-white shadow-2xl border border-gray-100 rounded-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="p-2 border-b border-gray-50 flex items-center gap-2">
                            <Search size={12} className="text-gray-400" />
                            <input 
                                ref={inputRef}
                                type="text"
                                placeholder="Assign to user..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="bg-transparent border-none focus:ring-0 text-xs w-full placeholder:text-gray-400"
                            />
                        </div>
                        
                        <div className="max-h-64 overflow-y-auto p-1 py-1.5 custom-scrollbar">
                            <button 
                                onClick={(e) => handleSelect(e, null)}
                                className={twMerge(
                                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                                    !optimisticAssigneeId ? "bg-gray-50" : "hover:bg-gray-50"
                                )}
                            >
                                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                                    <User size={12} />
                                </div>
                                <span className="text-xs font-medium text-gray-600">Unassigned</span>
                            </button>

                            {filteredUsers.map((u) => (
                                <button
                                    key={u.id}
                                    onClick={(e) => handleSelect(e, u.id)}
                                    className={twMerge(
                                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                                        optimisticAssigneeId === u.id ? "bg-indigo-50" : "hover:bg-gray-50"
                                    )}
                                >
                                    <UserAvatar name={u.name} avatarUrl={u.avatar_url} size="xs" />
                                    <div className="flex flex-col min-w-0">
                                        <span className={twMerge(
                                            "text-xs font-semibold truncate",
                                            optimisticAssigneeId === u.id ? "text-indigo-600" : "text-gray-700"
                                        )}>
                                            {u.name}
                                        </span>
                                        {u.email && <span className="text-[10px] text-gray-400 truncate">{u.email}</span>}
                                    </div>
                                </button>
                            ))}

                            {filteredUsers.length === 0 && search && (
                                <div className="px-3 py-4 text-center text-xs text-gray-400 italic">
                                    No users found matching &quot;{search}&quot;
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
})

IssueAssigneeSelector.displayName = 'IssueAssigneeSelector';
