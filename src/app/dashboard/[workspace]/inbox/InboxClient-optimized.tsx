'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, User, Calendar, Tag, CheckCircle, XCircle, AlertCircle, Clock, Paperclip, Pencil, Trash2, ChevronRight } from 'lucide-react';
import { fetchEntityCriticalAction, fetchEntityActivityAction, safeBatchPrefetch } from './actions-optimized';
import { markAsRead } from '../notifications/actions';
import { editComment, deleteComment } from '../issues/actions';
import { toast } from 'sonner';
import { UserAvatar as UserAvatarComponent } from '@/components/ui/UserAvatar';

interface Notification {
    id: string;
    created_at: string;
    read_at: string | null;
    is_read: boolean;
    type: string;
    actor: {
        id: string;
        name: string;
        email: string;
        avatar_url: string | null;
    };
    entity_id: string;
    entity_type: string;
    title: string;
    description: string;
    metadata: any;
}

interface InboxClientOptimizedProps {
    initialNotifications: Notification[];
    initialSelectedId: string | null;
    initialEntityDetail?: any;
    initialEntityActivity?: any[];
    currentUser: any;
}

export function InboxClientOptimized({
    initialNotifications,
    initialSelectedId,
    initialEntityDetail,
    initialEntityActivity,
    currentUser
}: InboxClientOptimizedProps) {
    const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
    const [entityDetail, setEntityDetail] = useState<any>(initialEntityDetail);
    const [entityActivity, setEntityActivity] = useState<any[]>(initialEntityActivity || []);
    const [detailLoading, setDetailLoading] = useState(false);
    const [activityLoading, setActivityLoading] = useState(false);
    const [hasMoreActivity, setHasMoreActivity] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
    const [typeFilter, setTypeFilter] = useState<string[]>([]);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [commentActionLoading, setCommentActionLoading] = useState<string | null>(null);

    // Optimistic UI state management
    const [optimisticNotifications, addOptimisticState] = useState<Notification[]>(notifications);
    const selectedIdRef = useRef(selectedId);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Cache management with TTL
    const cacheRef = useRef({
        critical: new Map<string, any>(),
        activity: new Map<string, any[]>(),
        activityCursors: new Map<string, string>(),
        lastAccess: new Map<string, number>(),
        cleanupTimer: null as NodeJS.Timeout | null
    });

    // Initialize cache cleanup
    useEffect(() => {
        const cleanup = () => {
            const now = Date.now();
            const ttl = 10 * 60 * 1000; // 10 minutes
            
            cacheRef.current.lastAccess.forEach((timestamp, entityId) => {
                if (now - timestamp > ttl) {
                    cacheRef.current.critical.delete(entityId);
                    cacheRef.current.activity.delete(entityId);
                    cacheRef.current.activityCursors.delete(entityId);
                    cacheRef.current.lastAccess.delete(entityId);
                }
            });
        };

        // Initial cleanup
        cleanup();
        
        // Set up periodic cleanup
        cacheRef.current.cleanupTimer = setInterval(cleanup, 5 * 60 * 1000); // Every 5 minutes

        return () => {
            if (cacheRef.current.cleanupTimer) {
                clearInterval(cacheRef.current.cleanupTimer);
            }
        };
    }, []);

    // Update selectedId ref
    useEffect(() => {
        selectedIdRef.current = selectedId;
    }, [selectedId]);

    // OPTIMIZED: Smart prefetch with safety limits
    useEffect(() => {
        if (initialNotifications.length > 0) {
            const firstNotif = initialNotifications.find(n => n.id === initialSelectedId);
            if (firstNotif?.entity_id) {
                // Set initial cache if provided
                if (initialEntityDetail) {
                    cacheRef.current.critical.set(firstNotif.entity_id, initialEntityDetail.data);
                    cacheRef.current.activity.set(firstNotif.entity_id, initialEntityActivity || []);
                    cacheRef.current.lastAccess.set(firstNotif.entity_id, Date.now());
                } else {
                    // Fetch critical data immediately
                    fetchEntityCritical(firstNotif);
                }
                
                // Fetch activity data after critical data loads (non-blocking)
                setTimeout(() => fetchEntityActivity(firstNotif.entity_id, firstNotif.entity_type), 100);
            }

            // SAFE PREFETCH: Only prefetch critical data for next 2 items
            const nextTwoItems = initialNotifications.slice(1, 3);
            if (nextTwoItems.length > 0) {
                const entityIds = nextTwoItems.map(n => n.entity_id).filter(Boolean);
                const entityTypes = nextTwoItems.map(n => n.entity_type);
                
                if (entityIds.length > 0) {
                    safeBatchPrefetch(entityIds, entityTypes, 'dashboard').then(result => {
                        if (result.data) {
                            result.data.forEach(item => {
                                if (item.id) {
                                    cacheRef.current.critical.set(item.id, item);
                                    cacheRef.current.lastAccess.set(item.id, Date.now());
                                }
                            });
                        }
                    }).catch(err => {
                        console.warn('[Inbox] Dashboard prefetch failed:', err);
                    });
                }
            }

            // Auto-mark as read
            if (firstNotif && !firstNotif.is_read) {
                // TODO: Add optimistic state management
                markAsRead(firstNotif.id);
            }
        }
    }, [initialSelectedId]);

    const supabase = useMemo(() => createClient(), []);

    // OPTIMIZED: Critical data fetching with caching
    async function fetchEntityCritical(notification: Notification) {
        if (!notification?.entity_id) return;

        // Check cache first
        if (cacheRef.current.critical.has(notification.entity_id)) {
            const cached = cacheRef.current.critical.get(notification.entity_id);
            setEntityDetail({ type: notification.entity_type, data: cached });
            setDetailLoading(false);
            return cached;
        }

        setDetailLoading(true);

        try {
            const result = await fetchEntityCriticalAction(notification.entity_id, notification.entity_type);
            
            if (result.error) {
                console.error('[Inbox] Critical fetch error:', result.error);
                setDetailLoading(false);
                return;
            }

            // Update cache
            cacheRef.current.critical.set(notification.entity_id, result.critical);
            cacheRef.current.lastAccess.set(notification.entity_id, Date.now());

            // Update state
            setEntityDetail({ type: notification.entity_type, data: result.critical });
            setDetailLoading(false);
            return result.critical;
        } catch (err) {
            if (selectedIdRef.current === notification.id) {
                setDetailLoading(false);
            }
            throw err;
        }
    }

    // OPTIMIZED: Activity fetching with pagination
    async function fetchEntityActivity(entityId: string, entityType: string, loadMore = false) {
        if (!entityId) return;

        const cursor = loadMore ? cacheRef.current.activityCursors.get(entityId) : undefined;
        
        if (!loadMore && cacheRef.current.activity.has(entityId)) {
            const cached = cacheRef.current.activity.get(entityId) || [];
            setEntityActivity(cached);
            return;
        }

        if (loadMore) setActivityLoading(true);

        try {
            const result = await fetchEntityActivityAction(entityId, entityType, cursor);
            
            if (result.error) {
                console.error('[Inbox] Activity fetch error:', result.error);
                return;
            }

            const existingActivity = loadMore ? (cacheRef.current.activity.get(entityId) || []) : [];
            const newActivity = [...existingActivity, ...(result.activity || [])];
            
            // Update cache
            cacheRef.current.activity.set(entityId, newActivity);
            if (result.nextCursor) {
                cacheRef.current.activityCursors.set(entityId, result.nextCursor);
            }
            cacheRef.current.lastAccess.set(entityId, Date.now());

            // Update state
            setEntityActivity(newActivity);
            setHasMoreActivity(result.hasMore);
        } catch (err) {
            console.error('[Inbox] Activity fetch error:', err);
        } finally {
            if (loadMore) setActivityLoading(false);
        }
    }

    // OPTIMIZED: Selection handler with prefetch
    const handleSelectNotification = useCallback(async (notification: Notification) => {
        if (selectedId === notification.id) return;

        setSelectedId(notification.id);
        setEntityDetail(null);
        setEntityActivity([]);
        setHasMoreActivity(false);

        // Fetch critical data immediately
        await fetchEntityCritical(notification);
        
        // Fetch activity data after critical loads (non-blocking)
        setTimeout(() => fetchEntityActivity(notification.entity_id, notification.entity_type), 100);

        // Auto-mark as read
        if (!notification.is_read) {
            // TODO: Add optimistic state management
            markAsRead(notification.id);
        }
    }, [selectedId]);

    // Comment handlers
    const handleEditCommentStart = (item: any) => {
        setEditingCommentId(item.id);
        setEditValue(item.comment);
    };

    const handleEditCommentCancel = () => {
        setEditingCommentId(null);
        setEditValue('');
    };

    const handleEditCommentSave = async (commentId: string, ticketId: string) => {
        const text = editValue.trim();
        if (!text || commentActionLoading) return;

        const originalText = entityActivity.find(a => a.id === commentId)?.comment || '';
        setEntityActivity(prev => prev.map(a => a.id === commentId ? { ...a, comment: text } : a));
        setEditingCommentId(null);
        setCommentActionLoading(commentId);

        const result = await editComment(commentId, ticketId, text);
        if (result.error) {
            setEntityActivity(prev => prev.map(a => a.id === commentId ? { ...a, comment: originalText } : a));
            toast.error(result.error);
        } else {
            toast.success('Comment updated');
            // Invalidate cache to force refresh with new data
            if (selectedId) {
                const selectedNotif = notifications.find(n => n.id === selectedId);
                if (selectedNotif?.entity_id) {
                    cacheRef.current.activity.delete(selectedNotif.entity_id);
                    // Re-fetch to get updated view data
                    fetchEntityActivity(selectedNotif.entity_id, selectedNotif.entity_type);
                }
            }
        }
        setCommentActionLoading(null);
    };

    const handleDeleteComment = async (commentId: string, ticketId: string) => {
        if (commentActionLoading || !confirm('Delete this comment?')) return;

        const originalActivity = [...entityActivity];
        setEntityActivity(prev => prev.filter(a => a.id !== commentId));
        setCommentActionLoading(commentId);

        const result = await deleteComment(commentId, ticketId);
        if (result.error) {
            setEntityActivity(originalActivity);
            toast.error(result.error);
        } else {
            toast.success('Comment deleted');
            // Invalidate cache to force refresh with new data
            if (selectedId) {
                const selectedNotif = notifications.find(n => n.id === selectedId);
                if (selectedNotif?.entity_id) {
                    cacheRef.current.activity.delete(selectedNotif.entity_id);
                    // Re-fetch to get updated view data
                    fetchEntityActivity(selectedNotif.entity_id, selectedNotif.entity_type);
                }
            }
        }
        setCommentActionLoading(null);
    };

    // Load more activity
    const handleLoadMoreActivity = () => {
        if (selectedId) {
            const selectedNotif = notifications.find(n => n.id === selectedId);
            if (selectedNotif?.entity_id) {
                fetchEntityActivity(selectedNotif.entity_id, selectedNotif.entity_type, true);
            }
        }
    };

    // Realtime subscription
    useEffect(() => {
        if (!currentUser?.id) return;

        const channel = supabase
            .channel('inbox-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}` },
                async (payload: any) => {
                    if (payload.eventType === 'INSERT') {
                        const { data } = await supabase
                            .from('notifications')
                            .select('*, actor:users!actor_id(id, name, email, avatar_url)')
                            .eq('id', payload.new.id)
                            .single();
                        if (data) {
                            const actor = Array.isArray(data.actor) ? data.actor[0] : data.actor;
                            setNotifications(prev => [{ ...data, actor }, ...prev]);
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        setNotifications(prev => prev.map(n => 
                            n.id === payload.new.id ? { ...n, ...payload.new } : n
                        ));
                    } else if (payload.eventType === 'DELETE') {
                        setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser?.id]);

    // Format time helper
    const formatTime = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return formatDistanceToNow(date, { addSuffix: true });
        } catch {
            return 'Invalid date';
        }
    };

    // Filter and sort notifications
    const filteredAndSorted = useMemo(() => {
        let result = [...optimisticNotifications];
        
        if (typeFilter.length > 0) {
            result = result.filter(n => typeFilter.includes(n.type));
        }
        
        return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [optimisticNotifications, typeFilter]);

    const clearFilters = () => setTypeFilter([]);

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'assignment': return <User className="w-4 h-4" />;
            case 'status_change': return <AlertCircle className="w-4 h-4" />;
            case 'comment': return <MessageSquare className="w-4 h-4" />;
            case 'ticket': return <CheckCircle className="w-4 h-4" />;
            case 'project': return <Tag className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-blue-100 text-blue-800';
            case 'in_progress': return 'bg-yellow-100 text-yellow-800';
            case 'resolved': return 'bg-green-100 text-green-800';
            case 'closed': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'low': return 'bg-gray-100 text-gray-800';
            case 'medium': return 'bg-orange-100 text-orange-800';
            case 'high': return 'bg-red-100 text-red-800';
            case 'urgent': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="flex h-full bg-white">
            {/* Left Panel - Notification List */}
            <div className="w-[380px] shrink-0 border-r border-gray-200 flex flex-col h-full bg-white">
                {/* Header */}
                <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Notifications</h2>
                    <div className="flex flex-wrap gap-2">
                        {['assignment', 'status_change', 'comment', 'ticket', 'project'].map(type => (
                            <button
                                key={type}
                                onClick={() => {
                                    setTypeFilter(prev => 
                                        prev.includes(type) 
                                            ? prev.filter(t => t !== type)
                                            : [...prev, type]
                                    );
                                }}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                    typeFilter.includes(type)
                                        ? 'bg-indigo-100 text-indigo-800'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {getNotificationIcon(type)}
                                <span className="ml-1 capitalize">{type.replace('_', ' ')}</span>
                            </button>
                        ))}
                        {typeFilter.length > 0 && (
                            <button
                                onClick={clearFilters}
                                className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Notification List */}
                <div className="flex-1 overflow-y-auto">
                    {filteredAndSorted.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <MessageSquare size={32} className="mb-2" />
                            <p className="text-sm">No notifications</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {filteredAndSorted.map((notification) => (
                                <button
                                    key={notification.id}
                                    onClick={() => handleSelectNotification(notification)}
                                    onMouseEnter={() => {
                                        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                        hoverTimeoutRef.current = setTimeout(() => {
                                            // SAFE HOVER PREFETCH: Use batch prefetch with limits
                                            safeBatchPrefetch([notification.entity_id], [notification.entity_type], 'hover')
                                                .then(result => {
                                                    if (result.data && result.data.length > 0) {
                                                        const item = result.data[0];
                                                        cacheRef.current.critical.set(notification.entity_id, item);
                                                        cacheRef.current.lastAccess.set(notification.entity_id, Date.now());
                                                    }
                                                })
                                                .catch(err => {
                                                    console.warn('[Inbox] Hover prefetch failed:', err);
                                                });
                                        }, 300); // Debounced hover
                                    }}
                                    onMouseLeave={() => {
                                        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                    }}
                                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                                        selectedId === notification.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                                    } ${!notification.is_read ? 'bg-blue-50' : ''}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                            {getNotificationIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {notification.title}
                                                </span>
                                                {!notification.is_read && (
                                                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 truncate">{notification.description}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <UserAvatarComponent
                                                    name={notification.actor.name}
                                                    avatarUrl={notification.actor.avatar_url}
                                                    size="xs"
                                                />
                                                <span className="text-xs text-gray-400">
                                                    {formatTime(notification.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel - Entity Detail */}
            <div className="flex-1 flex flex-col h-full">
                {selectedId && entityDetail ? (
                    <>
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-semibold text-gray-900">
                                    {entityDetail.data.title || 'Untitled'}
                                </h3>
                                <div className="flex items-center gap-2">
                                    {entityDetail.data.status && (
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(entityDetail.data.status)}`}>
                                            {entityDetail.data.status.replace('_', ' ')}
                                        </span>
                                    )}
                                    {entityDetail.data.priority && (
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(entityDetail.data.priority)}`}>
                                            {entityDetail.data.priority}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Metadata */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">Type:</span>
                                    <span className="ml-2 font-medium capitalize">{entityDetail.type}</span>
                                </div>
                                {entityDetail.data.projects && (
                                    <div>
                                        <span className="text-gray-500">Project:</span>
                                        <span className="ml-2 font-medium">{entityDetail.data.projects.project_name}</span>
                                    </div>
                                )}
                                {entityDetail.data.created_by_user && (
                                    <div>
                                        <span className="text-gray-500">Created by:</span>
                                        <div className="inline-flex items-center gap-2 ml-2">
                                            <UserAvatarComponent
                                                name={entityDetail.data.created_by_user.name}
                                                avatarUrl={entityDetail.data.created_by_user.avatar_url}
                                                size="xs"
                                            />
                                            <span className="font-medium">{entityDetail.data.created_by_user.name}</span>
                                        </div>
                                    </div>
                                )}
                                {entityDetail.data.assigned_to_user && (
                                    <div>
                                        <span className="text-gray-500">Assigned to:</span>
                                        <div className="inline-flex items-center gap-2 ml-2">
                                            <UserAvatarComponent
                                                name={entityDetail.data.assigned_to_user.name}
                                                avatarUrl={entityDetail.data.assigned_to_user.avatar_url}
                                                size="xs"
                                            />
                                            <span className="font-medium">{entityDetail.data.assigned_to_user.name}</span>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <span className="text-gray-500">Created:</span>
                                    <span className="ml-2 font-medium">{formatTime(entityDetail.data.created_at)}</span>
                                </div>
                                {entityDetail.data.due_date && (
                                    <div>
                                        <span className="text-gray-500">Due:</span>
                                        <span className="ml-2 font-medium">{formatTime(entityDetail.data.due_date)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Activity section with skeleton loading */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-900 mb-4">Activity</h3>
                                
                                {activityLoading && entityActivity.length === 0 ? (
                                    // Skeleton loading for initial activity load
                                    <div className="space-y-3">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-lg animate-pulse">
                                                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : entityActivity.length > 0 ? (
                                    <>
                                        {entityActivity.map((item, index) => (
                                            <div key={`${item.activityType}-${item.id}-${index}`} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                                                <UserAvatarComponent
                                                    name={item.users?.name || 'Unknown'}
                                                    avatarUrl={item.users?.avatar_url}
                                                    size="sm"
                                                    className="mt-0.5"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-medium text-gray-900">
                                                            {item.users?.name}
                                                        </span>
                                                        <span className="text-xs text-gray-400">
                                                            {formatTime(item.created_at)}
                                                        </span>
                                                    </div>
                                                    {item.activityType === 'comment' ? (
                                                        <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                                            {editingCommentId === item.id ? (
                                                                <div className="space-y-2">
                                                                    <textarea
                                                                        value={editValue}
                                                                        onChange={(e) => setEditValue(e.target.value)}
                                                                        className="w-full p-2 text-sm border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                        rows={3}
                                                                    />
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => handleEditCommentSave(item.id, entityDetail.data.id)}
                                                                            disabled={commentActionLoading === item.id}
                                                                            className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                                                                        >
                                                                            Save
                                                                        </button>
                                                                        <button
                                                                            onClick={handleEditCommentCancel}
                                                                            className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="group relative">
                                                                    <p>{item.comment}</p>
                                                                    {currentUser?.id === item.user_id && (
                                                                        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                                            <button
                                                                                onClick={() => handleEditCommentStart(item)}
                                                                                className="p-1 text-gray-400 hover:text-gray-600"
                                                                            >
                                                                                <Pencil size={12} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteComment(item.id, entityDetail.data.id)}
                                                                                disabled={commentActionLoading === item.id}
                                                                                className="p-1 text-gray-400 hover:text-red-600"
                                                                            >
                                                                                <Trash2 size={12} />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-gray-600">
                                                            {/* View pre-formats log descriptions */}
                                                            <span>{item.comment}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        
                                        {/* Load more button */}
                                        {hasMoreActivity && (
                                            <button
                                                onClick={handleLoadMoreActivity}
                                                disabled={activityLoading}
                                                className="w-full py-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
                                            >
                                                {activityLoading ? 'Loading...' : 'Load more activity'}
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-8 text-gray-400">
                                        <MessageSquare size={32} className="mx-auto mb-2 text-gray-300" />
                                        <p className="text-sm">
                                            {activityLoading ? 'Loading activity...' : 'No activity yet'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        <div className="text-center">
                            <MessageSquare size={48} className="mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium">Select a notification</p>
                            <p className="text-sm mt-2">Choose an item from the list to view details</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
