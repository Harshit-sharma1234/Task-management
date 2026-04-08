'use client';

import { useState, useEffect, useMemo, useCallback, useOptimistic, useRef, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { createClient } from '@/lib/supabase/client';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { getInitials, getBadgeColor } from '@/lib/avatar';
import { 
    markAsRead, 
    markAllAsRead, 
    deleteAllNotifications, 
    deleteAllReadNotifications,
    deleteNotification
} from '@/app/dashboard/notifications/actions';
import { fetchEntityDetailAction } from './actions';
import { cn, formatTime } from '@/lib/utils';
import { STATUS_ICONS, PRIORITY_ICONS } from '@/lib/constants';
import { 
    Loader2, BellOff, MoreHorizontal, Filter, Settings2, Check, Trash2, CheckCircle2, X,
    ChevronRight, MessageSquare, UserPlus, Zap, FileText, Circle, CircleEllipsis,
    SignalHigh, SignalMedium, SignalLow, FolderKanban, Clock, ArrowLeft
} from 'lucide-react';
import { PropertyInlineRow } from '@/components/dashboard/issues/PropertyInlineRow';
import { useNotificationStore } from '@/lib/store/notifications';



// Constants are now imported from '@/lib/constants'

type ViewOptions = {
    ordering: 'newest' | 'oldest';
    showRead: boolean;
    unreadFirst: boolean;
};

interface InboxClientProps {
    initialNotifications: any[];
    allUsers: any[];
    currentUser: any;
    initialSelectedId: string | null;
    initialEntityDetail: any;
    initialEntityActivity: any[];
}

export default function InboxClient({
    initialNotifications,
    allUsers,
    currentUser,
    initialSelectedId,
    initialEntityDetail,
    initialEntityActivity,
}: InboxClientProps) {
    // ── State: initialized from server-fetched props (no loading spinner) ──
    const [notifications, setNotifications] = useState<any[]>(initialNotifications);
    const [optimisticNotifications, addOptimisticState] = useOptimistic(
        notifications,
        (state: any[], { id, isRead }: { id: string; isRead: boolean }) => 
            state.map(n => n.id === id ? { ...n, is_read: isRead } : n)
    );
    const [loading, setLoading] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
    const [entityDetail, setEntityDetail] = useState<any>(initialEntityDetail);
    const [entityActivity, setEntityActivity] = useState<any[]>(initialEntityActivity);
    const [detailLoading, setDetailLoading] = useState(false);
    const [viewOptions, setViewOptions] = useState<ViewOptions>({
        ordering: 'newest',
        showRead: true,
        unreadFirst: true,
    });
    const [showActions, setShowActions] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [showViewOptions, setShowViewOptions] = useState(false);
    const [typeFilter, setTypeFilter] = useState<string[]>([]);
    const setGlobalUnreadCount = useNotificationStore((s) => s.setUnreadCount);
    const parentRef = useRef<HTMLDivElement>(null);
    const detailCache = useRef<Map<string, { detail: any; activity: any[] }>>(new Map());
    const fetchPromises = useRef<Map<string, Promise<any>>>(new Map());
    const selectedIdRef = useRef(selectedId);
    const hoverTimeoutRef = useRef<any>(null);
    
    useEffect(() => {
        selectedIdRef.current = selectedId;
    }, [selectedId]);

    // ── INITIAL PREFETCH (Top 3) ───────────────────
    useEffect(() => {
        if (initialNotifications.length > 0) {
            // First item logic
            const firstNotif = initialNotifications.find(n => n.id === initialSelectedId);
            if (firstNotif?.entity_id) {
                if (initialEntityDetail) {
                    detailCache.current.set(firstNotif.entity_id, {
                        detail: initialEntityDetail,
                        activity: initialEntityActivity
                    });
                } else {
                    fetchEntityDetail(firstNotif);
                }
            }

            // Prefetch next 2 for instant feels
            initialNotifications.slice(1, 3).forEach(n => {
                fetchEntityDetail(n, true);
            });
        }
    }, []);

    const supabase = useMemo(() => createClient(), []);

    // ── Realtime subscription only — no initial fetch needed ──
    useEffect(() => {
        if (!currentUser?.id) return;

        const channel = supabase
            .channel('inbox-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` },
                async (payload) => {
                    if (payload.eventType === 'INSERT') {
                        // Targeted fetch for the single new notification to include joined actor data
                        const { data } = await supabase
                            .from('notifications')
                            .select('*, actor:actor_id(id, name, email, avatar_url)')
                            .eq('id', payload.new.id)
                            .single();
                        if (data) setNotifications(prev => [data, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setNotifications(prev => prev.map(n => n.id === payload.new.id ? { ...n, ...payload.new } : n));
                    } else if (payload.eventType === 'DELETE') {
                        setNotifications(prev => prev.filter(n => n.id === payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id]);

    // fetchNotifications removed in favor of Realtime updates (reduces redundant requests)

    async function fetchEntityDetail(notification: any, isPrefetch = false) {
        if (!notification?.entity_id) return;
        const entityId = notification.entity_id;
        const entityType = notification.entity_type;

        // 1. If we have it in cache, update state immediately (even if prefetching, to keep sync)
        if (detailCache.current.has(entityId)) {
            const cached = detailCache.current.get(entityId);
            if (!isPrefetch || selectedId === notification.id) {
                setEntityDetail(cached?.detail);
                setEntityActivity(cached?.activity || []);
                setDetailLoading(false);
            }
            return;
        }

        // 2. If already fetching this ID, wait for it
        if (fetchPromises.current.has(entityId)) {
            if (!isPrefetch) setDetailLoading(true);
            const result = await fetchPromises.current.get(entityId);
            if (selectedId === notification.id) {
                setEntityDetail(result.detail);
                setEntityActivity(result.activity);
                setDetailLoading(false);
            }
            return;
        }

        // 3. Start new fetch
        if (!isPrefetch) {
            setDetailLoading(true);
            // STALE-WHILE-REVALIDATE: We NO LONGER call setEntityDetail(null) here.
            // This ensures the previous item stays visible while the new one loads.
        }

        const fetchPromise = (async () => {
            try {
                const result = await fetchEntityDetailAction(entityId, entityType);
                
                if (result.detail) {
                    const formattedDetail = { type: entityType, data: result.detail };
                    detailCache.current.set(entityId, { 
                        detail: formattedDetail, 
                        activity: result.activity 
                    });
                    return { detail: formattedDetail, activity: result.activity };
                }
                return { detail: null, activity: [] };
            } catch (err) {
                console.error('[Inbox] Fetch error:', err);
                return { detail: null, activity: [] };
            } finally {
                fetchPromises.current.delete(entityId);
            }
        })();

        fetchPromises.current.set(entityId, fetchPromise);
        const finalResult = await fetchPromise;

        // 4. Final UI update ONLY if this is still the selected notification
        if (selectedIdRef.current === notification.id) {
            setEntityDetail(finalResult.detail);
            setEntityActivity(finalResult.activity);
            setDetailLoading(false);
        }
    }

    const filteredAndSorted = useMemo(() => {
        let result = [...optimisticNotifications];

        if (!viewOptions.showRead) {
            result = result.filter(n => !n.is_read);
        }
        if (typeFilter.length > 0) {
            result = result.filter(n => typeFilter.includes(n.type));
        }

        result.sort((a, b) => {
            if (viewOptions.unreadFirst) {
                if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
            }
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return viewOptions.ordering === 'newest' ? dateB - dateA : dateA - dateB;
        });

        return result;
    }, [notifications, viewOptions, typeFilter]);

    const virtualizer = useVirtualizer({
        count: filteredAndSorted.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 74, // Approximate height of a NotificationRow
        overscan: 10,
    });

    const selectedNotification = useMemo(() => notifications.find(n => n.id === selectedId), [notifications, selectedId]);

    function handleSelect(notification: any) {
        if (selectedId === notification.id) return;
        setSelectedId(notification.id);
        fetchEntityDetail(notification);
        // Auto-mark as read
        if (!notification.is_read) {
            addOptimisticState({ id: notification.id, isRead: true });
            markAsRead(notification.id);
        }
    }

    const handleMarkAllRead = async () => {
        await markAllAsRead();
        setGlobalUnreadCount(0);
        setShowActions(false);
    };

    const handleDeleteAll = async () => {
        if (confirm('Are you sure you want to delete ALL notifications?')) {
            await deleteAllNotifications();
            setSelectedId(null);
            setEntityDetail(null);
            setShowActions(false);
        }
    };

    const handleDeleteRead = async () => {
        await deleteAllReadNotifications();
        setShowActions(false);
    };

    const handleDeleteNotification = useCallback(async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        
        // Optimistic update
        const previousNotifications = [...notifications];
        setNotifications(prev => prev.filter(n => n.id !== id));
        
        if (selectedId === id) {
            setSelectedId(null);
            setEntityDetail(null);
        }

        try {
            await deleteNotification(id);
        } catch (err) {
            console.error('[Inbox] Failed to delete notification:', err);
            // Rollback on error
            setNotifications(previousNotifications);
        }
    }, [notifications, selectedId, deleteNotification]);

    const clearFilters = () => setTypeFilter([]);

    const toggleTypeFilter = (type: string) => {
        setTypeFilter(prev => 
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const typeIcon = (type: string) => {
        switch (type) {
            case 'assignment': return <UserPlus size={13} />;
            case 'comment': return <MessageSquare size={13} />;
            case 'mention': return <span className="text-[11px] font-bold">@</span>;
            case 'status_change': return <Zap size={13} />;
            default: return <FileText size={13} />;
        }
    };

    return (
        <div className="flex h-full bg-white">
            {/* ── LEFT PANEL: Notification List ─────────────────── */}
            <div className="w-[380px] shrink-0 border-r border-gray-200 flex flex-col h-full bg-white">
                {/* List Header */}
                <header className="h-12 border-b border-gray-100 px-4 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <h1 className="text-[14px] font-bold text-gray-900">Inbox</h1>
                        {/* Actions Menu */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowActions(!showActions)}
                                className={`p-1 rounded transition-colors ${showActions ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                            >
                                <MoreHorizontal size={14} className="text-gray-400" />
                            </button>
                            {showActions && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setShowActions(false)} />
                                    <div className="absolute left-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-xl z-40 py-1 overflow-hidden">
                                        <button onClick={handleMarkAllRead} className="w-full px-3 py-2 text-left text-[12px] text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                            <CheckCircle2 size={13} className="text-gray-400" />
                                            Mark all as read
                                        </button>
                                        <button onClick={handleDeleteRead} className="w-full px-3 py-2 text-left text-[12px] text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-t border-gray-50">
                                            <X size={13} className="text-gray-400" />
                                            Delete all read
                                        </button>
                                        <button onClick={handleDeleteAll} className="w-full px-3 py-2 text-left text-[12px] text-red-600 hover:bg-red-50 flex items-center gap-2">
                                            <Trash2 size={13} className="text-red-400" />
                                            Delete all
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {typeFilter.length > 0 && (
                            <button 
                                onClick={clearFilters}
                                className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded flex items-center gap-1 mr-1"
                            >
                                Clear <X size={8} />
                            </button>
                        )}
                        {/* Filter button */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowFilters(!showFilters)}
                                className={`p-1 rounded transition-colors ${showFilters ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                            >
                                <Filter size={14} className="text-gray-400" />
                            </button>
                            {showFilters && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setShowFilters(false)} />
                                    <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-40 py-1">
                                        <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Type</div>
                                        {['assignment', 'comment', 'mention', 'status_change'].map(t => (
                                            <button 
                                                key={t}
                                                onClick={() => toggleTypeFilter(t)}
                                                className="w-full px-3 py-1.5 text-left text-[12px] text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                                            >
                                                <span className="capitalize">{t.replace('_', ' ')}</span>
                                                {typeFilter.includes(t) && <Check size={12} className="text-indigo-600" />}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        {/* View Options */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowViewOptions(!showViewOptions)}
                                className={`p-1 rounded transition-colors ${showViewOptions ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                            >
                                <Settings2 size={14} className="text-gray-400" />
                            </button>
                            {showViewOptions && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setShowViewOptions(false)} />
                                    <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-xl z-40 py-2">
                                        <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ordering</div>
                                        <select 
                                            value={viewOptions.ordering}
                                            onChange={(e) => setViewOptions(prev => ({ ...prev, ordering: e.target.value as any }))}
                                            className="mx-3 my-1 bg-gray-50 border border-gray-100 rounded px-2 py-1 text-[12px] w-[calc(100%-24px)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        >
                                            <option value="newest">Newest first</option>
                                            <option value="oldest">Oldest first</option>
                                        </select>
                                        <div className="h-px bg-gray-50 my-1.5" />
                                        <button 
                                            onClick={() => setViewOptions(prev => ({ ...prev, showRead: !prev.showRead }))}
                                            className="w-full px-3 py-1.5 hover:bg-gray-50 flex items-center justify-between text-[12px] text-gray-700"
                                        >
                                            <span>Show read</span>
                                            <div className={`w-7 h-3.5 rounded-full transition-colors relative ${viewOptions.showRead ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                                                <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-transform ${viewOptions.showRead ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                                            </div>
                                        </button>
                                        <button 
                                            onClick={() => setViewOptions(prev => ({ ...prev, unreadFirst: !prev.unreadFirst }))}
                                            className="w-full px-3 py-1.5 hover:bg-gray-50 flex items-center justify-between text-[12px] text-gray-700"
                                        >
                                            <span>Unread first</span>
                                            <div className={`w-7 h-3.5 rounded-full transition-colors relative ${viewOptions.unreadFirst ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                                                <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-transform ${viewOptions.unreadFirst ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                                            </div>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Notification List */}
                <div ref={parentRef} className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
                            <Loader2 className="animate-spin text-indigo-600" size={24} />
                            <p className="text-xs font-medium">Loading inbox...</p>
                        </div>
                    ) : filteredAndSorted.length > 0 ? (
                        <div 
                            style={{ 
                                height: `${virtualizer.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative'
                            }}
                        >
                            {virtualizer.getVirtualItems().map((virtualRow) => {
                                const notification = filteredAndSorted[virtualRow.index];
                                if (!notification) return null;

                                return (
                                    <div
                                        key={notification.id}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: `${virtualRow.size}px`,
                                            transform: `translateY(${virtualRow.start}px)`,
                                        }}
                                    >
                                        <NotificationRow 
                                            notification={notification} 
                                            selected={selectedId === notification.id}
                                            onSelect={() => handleSelect(notification)}
                                            onDelete={(e: React.MouseEvent) => handleDeleteNotification(e, notification.id)}
                                            onMouseEnter={() => {
                                                clearTimeout(hoverTimeoutRef.current);
                                                hoverTimeoutRef.current = setTimeout(() => {
                                                    fetchEntityDetail(notification, true);
                                                }, 200);
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center px-6 py-20">
                            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                                <BellOff className="text-gray-300" size={24} />
                            </div>
                            <h2 className="text-sm font-semibold text-gray-700 mb-1">No notifications</h2>
                            <p className="text-xs text-gray-400 max-w-[200px]">
                                {typeFilter.length > 0 ? "No matches for your filters." : "You're all caught up!"}
                            </p>
                            {typeFilter.length > 0 && (
                                <button onClick={clearFilters} className="mt-3 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 transition-colors">
                                    Clear filters
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── RIGHT PANEL: Detail View ─────────────────── */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
                {!selectedNotification ? (
                    <div className="flex-1 flex items-center justify-center text-gray-300">
                        <div className="text-center">
                            <MessageSquare size={40} className="mx-auto mb-3 text-gray-200" />
                            <p className="text-sm font-medium text-gray-400">Select a notification</p>
                            <p className="text-xs text-gray-300 mt-1">Details will appear here</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Breadcrumb */}
                        <div className="h-12 flex items-center px-6 border-b border-gray-100 bg-white shrink-0">
                            <div className="flex items-center gap-2 text-[12px] font-medium text-gray-400">
                                {entityDetail?.type === 'ticket' && entityDetail.data?.projects?.project_name && (
                                    <>
                                        <span className="text-gray-500">{entityDetail.data.projects.project_name}</span>
                                        <ChevronRight size={12} className="text-gray-300" />
                                    </>
                                )}
                                <span className="text-gray-500 uppercase">
                                    {selectedNotification.entity_type === 'ticket' ? 'KAP-' : 'PRJ-'}
                                    {selectedNotification.entity_id?.slice(0, 4)}
                                </span>
                                <ChevronRight size={12} className="text-gray-300" />
                                <span className="text-gray-700 font-semibold truncate max-w-[300px]">
                                    {entityDetail?.data?.title || entityDetail?.data?.project_name || 'Loading...'}
                                </span>
                            </div>
                        </div>

                        <div className={cn(
                            "flex-1 overflow-y-auto relative transition-opacity duration-200",
                            detailLoading ? "opacity-40" : "opacity-100"
                        )}>
                            {detailLoading && !entityDetail && (
                                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/50">
                                    <Loader2 className="animate-spin text-indigo-500" size={24} />
                                </div>
                            )}

                            {!entityDetail && !detailLoading ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
                                    <BellOff className="mb-3 text-gray-200" size={40} />
                                    <p className="text-sm font-semibold text-gray-600">This item is no longer available</p>
                                    <p className="text-xs text-gray-400 mt-1">It may have been deleted or moved</p>
                                </div>
                            ) : entityDetail?.type === 'ticket' ? (
                                <div className="max-w-3xl mx-auto px-8 py-8">
                                    {/* Title */}
                                    <h1 className="text-2xl font-bold text-gray-900 mb-6">
                                        {entityDetail.data.title}
                                    </h1>

                                    {/* Description */}
                                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-8">
                                        {entityDetail.data.description || 'No description provided.'}
                                    </div>

                                    <div className="mb-8 py-4 border-y border-gray-100">
                                        <PropertyInlineRow 
                                            ticketId={entityDetail.data.id}
                                            initialStatus={entityDetail.data.status}
                                            initialPriority={entityDetail.data.priority}
                                            initialAssigneeId={entityDetail.data.assignee_id}
                                            projectName={entityDetail.data.projects?.project_name || 'N/A'}
                                            users={allUsers}
                                            currentUserId={currentUser?.id || ''}
                                            reviewerId={entityDetail.data.reviewer_id}
                                        />
                                        
                                        {/* Due Date */}
                                        {entityDetail.data.due_date && (
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-md w-fit">
                                                <Clock size={12} className="text-gray-400" />
                                                <span>Due {new Date(entityDetail.data.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Activity Section */}
                                    <div className="mt-4">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                                <MessageSquare size={15} />
                                                <span>Activity</span>
                                            </div>
                                        </div>

                                        <div className="space-y-5">
                                            {entityActivity.map((item, idx) => (
                                                <ActivityItem key={`${item.activityType}-${item.id}`} item={item} />
                                            ))}

                                            {entityActivity.length === 0 && (
                                                <p className="text-xs text-gray-400 italic py-4">No activity yet.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : entityDetail?.type === 'project' ? (
                                <div className="max-w-3xl mx-auto px-8 py-8">
                                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                                        {entityDetail.data.project_name}
                                    </h1>
                                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-6">
                                        {entityDetail.data.description || 'No description provided.'}
                                    </div>
                                    {entityDetail.data.lead && (
                                        <div className="flex items-center gap-2 text-xs font-medium text-gray-600 bg-gray-50 px-3 py-2 rounded-md w-fit">
                                            <UserAvatar
                                                name={entityDetail.data.lead.name}
                                                avatarUrl={entityDetail.data.lead.avatar_url}
                                                size="sm"
                                            />
                                            <span>Lead: {entityDetail.data.lead.name}</span>
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

const NotificationRow = memo(({ notification, selected, onSelect, onDelete, onMouseEnter }: any) => {
    const actor = notification.actor
    
    return (
        <button
            onClick={onSelect}
            onMouseEnter={onMouseEnter}
            className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-colors flex items-start gap-3 group ${
                selected ? 'bg-indigo-50/60' : 'hover:bg-gray-50/50'
            }`}
        >
            {/* Avatar */}
            <div className="mt-0.5">
                <UserAvatar
                    name={actor?.name || 'User'}
                    avatarUrl={actor?.avatar_url}
                    size="md"
                />
            </div>

            <div className="flex-1 min-w-0">
                {/* Title row */}
                <div className="flex items-start justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                        {!notification.is_read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                        )}
                        <span className={`text-[13px] truncate ${!notification.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-600'}`}>
                            {notification.message.length > 50 
                                ? notification.message.substring(0, 50) + '...' 
                                : notification.message}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        {!notification.is_read && (
                            <span className="w-2 h-2 rounded-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                        <button
                            onClick={onDelete}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                            title="Delete notification"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                </div>
                {/* Subtitle row */}
                <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <span className="text-gray-500">{actor?.name || actor?.email}</span>
                    <span>·</span>
                    <span>{formatTime(notification.created_at)}</span>
                </div>
            </div>
        </button>
    )
});

NotificationRow.displayName = 'NotificationRow';

function ActivityItem({ item }: any) {
    const user = item.users

    return (
        <div className="flex gap-3">
            {/* Avatar */}
            <UserAvatar
                name={user?.name || 'User'}
                avatarUrl={user?.avatar_url}
                size="sm"
            />

            <div className="flex-1 min-w-0">
                {/* Name + time */}
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-semibold text-gray-900">
                        {user?.email || user?.name}
                    </span>
                    <span className="text-[11px] text-gray-400">
                        {formatTime(item.created_at)}
                    </span>
                </div>

                {/* Content */}
                {item.activityType === 'comment' ? (
                    <div className="text-[13px] text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-100 leading-relaxed">
                        {item.comment}
                    </div>
                ) : (
                    <div className="text-[12px] text-gray-500 italic">
                        {item.message || `${user?.name} updated the issue`}
                    </div>
                )}
            </div>
        </div>
    )
}
