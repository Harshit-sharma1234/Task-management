'use client';

import { useState, useRef, useEffect, startTransition } from 'react';
import { updateIssue } from '@/app/dashboard/[workspace]/issues/actions';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Search, Loader2, User } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface IssueReviewerSelectorProps {
    issueId: string;
    currentReviewerId: string | null;
    assigneeId: string | null;
    currentReviewer: { name: string, avatar_url?: string | null } | null;
    users: { id: string, name: string, email?: string, avatar_url?: string | null, roles?: { role_name: string } }[];
    currentUser?: any;
}

export function IssueReviewerSelector({
    issueId,
    currentReviewerId,
    assigneeId,
    currentReviewer,
    users,
    currentUser
}: IssueReviewerSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [search, setSearch] = useState('');
    const [optimisticReviewerId, setOptimisticReviewerId] = useState(currentReviewerId);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);


    const role = currentUser?.roles?.role_name;
    const isAdmin = role === 'Admin' || role === 'Project Manager';
    const isAssignee = currentUser?.id === assigneeId;
    const isReviewer = currentUser?.id === currentReviewerId;
    const canUpdate = isAdmin || isAssignee || isReviewer;

    useEffect(() => { setOptimisticReviewerId(currentReviewerId); }, [currentReviewerId]);

    const optimisticReviewer = users.find(u => u.id === optimisticReviewerId) || null;

    const filteredUsers = (users || [])
        .filter(u => {
            const matchesSearch = (u.name || '').toLowerCase().includes(search.toLowerCase());
            // Filter reviewer eligibility: Only Admin, PM, or Senior Developer
            const userRole = (u as any).roles?.role_name;
            const isEligible = userRole === 'Admin' || userRole === 'Project Manager' || userRole === 'Senior Developer';
            
            // "Sr Dev also cannot self-assign their own ticket for review"
            const isSelfReview = u.id === assigneeId;
            const isRestrictedSelfReview = isSelfReview && userRole === 'Senior Developer';
            
            return matchesSearch && isEligible && !isRestrictedSelfReview;
        });

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

    const handleSelect = (e: React.MouseEvent, userId: string | null) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (userId === optimisticReviewerId) {
            setIsOpen(false);
            return;
        }
        if (userId && userId === assigneeId) {
            toast.error("The reviewer cannot be the same as the assignee.");
            setIsOpen(false);
            return;
        }

        const previousReviewerId = optimisticReviewerId;
        setOptimisticReviewerId(userId);
        setIsOpen(false);
        setIsUpdating(true);

        startTransition(async () => {
            const res = await updateIssue(issueId, { reviewer_id: userId });
            if (res.error) {
                // Revert on failure
                setOptimisticReviewerId(previousReviewerId);
                toast.error(res.error);
            }
            setIsUpdating(false);
        });
    };

    return (
        <div className="relative group/reviewer" ref={dropdownRef}>
            <button
                onClick={(e) => {
                    if (!canUpdate) return;
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                disabled={isUpdating || !canUpdate}
                className={twMerge(
                    "relative flex items-center gap-2 transition-all rounded-md px-1 py-1 w-full text-left",
                    canUpdate ? "hover:bg-gray-100" : "cursor-not-allowed opacity-50",
                    isUpdating && "opacity-50"
                )}
            >
                <div className="relative shrink-0">
                    {optimisticReviewer ? (
                        <UserAvatar
                            name={optimisticReviewer.name}
                            avatarUrl={optimisticReviewer.avatar_url}
                            size="xs"
                        />
                    ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200">
                            <User size={10} />
                        </div>
                    )}
                    {isUpdating && (
                        <div className="absolute inset-0 bg-white/60 rounded-full flex items-center justify-center">
                            <Loader2 size={10} className="animate-spin text-indigo-600" />
                        </div>
                    )}
                </div>
                <span className="text-[11px] font-semibold text-gray-600 flex-1 truncate">
                    {optimisticReviewer?.name || 'No reviewer'}
                </span>
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
                                placeholder="Select reviewer..."
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
                                    !optimisticReviewerId ? "bg-gray-50" : "hover:bg-gray-50"
                                )}
                            >
                                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200">
                                    <User size={12} />
                                </div>
                                <span className="text-xs font-medium text-gray-600">No reviewer</span>
                            </button>

                            {filteredUsers.map((u) => (
                                <button
                                    key={u.id}
                                    onClick={(e) => handleSelect(e, u.id)}
                                    title={u.id === assigneeId ? "Reviewer cannot be the same as assignee" : ""}
                                    className={twMerge(
                                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                                        optimisticReviewerId === u.id ? "bg-indigo-50" : "hover:bg-gray-50",
                                        u.id === assigneeId ? "opacity-50 cursor-not-allowed" : ""
                                    )}
                                >
                                    <UserAvatar name={u.name} avatarUrl={u.avatar_url} size="xs" />
                                    <div className="flex flex-col min-w-0">
                                        <span className={twMerge(
                                            "text-xs font-semibold truncate",
                                            optimisticReviewerId === u.id ? "text-indigo-600" : "text-gray-700"
                                        )}>
                                            {u.name}
                                        </span>
                                        {u.email && <span className="text-[10px] text-gray-400 truncate">{u.email}</span>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
