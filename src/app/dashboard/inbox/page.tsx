'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { formatDistanceToNow } from 'date-fns';
import { 
    Loader2, 
    BellOff, 
    MoreHorizontal, 
    Filter, 
    Settings2, 
    Check, 
    Trash2, 
    CheckCircle2, 
    X,
    ChevronRight,
    MessageSquare,
    UserPlus,
    Zap,
    FileText,
    Circle,
    CircleEllipsis,
    SignalHigh,
    SignalMedium,
    SignalLow,
    FolderKanban, 
    Clock, 
    ArrowLeft
} from 'lucide-react';
import { PropertyInlineRow } from '@/components/dashboard/issues/PropertyInlineRow';



// Status icons for tickets
const statusIcons: Record<string, any> = {
    'to_do': { label: 'Todo', icon: Circle, color: 'text-gray-400' },
    'in_progress': { label: 'In Progress', icon: CircleEllipsis, color: 'text-yellow-500' },
    'done': { label: 'Done', icon: CheckCircle2, color: 'text-indigo-500' },
    'backlog': { label: 'Backlog', icon: Circle, color: 'text-gray-300' },
    'review': { label: 'Review', icon: CircleEllipsis, color: 'text-orange-500' },
    'in_review': { label: 'In Review', icon: CircleEllipsis, color: 'text-orange-600' },
    'cancelled': { label: 'Cancelled', icon: X, color: 'text-red-400' },
};

const priorityIcons: Record<string, any> = {
    'urgent': { label: 'Urgent', icon: SignalHigh, color: 'text-red-600' },
    'high': { label: 'High', icon: SignalHigh, color: 'text-red-500' },
    'medium': { label: 'Medium', icon: SignalMedium, color: 'text-yellow-500' },
    'low': { label: 'Low', icon: SignalLow, color: 'text-indigo-500' },
    'no_priority': { label: 'No priority', icon: MoreHorizontal, color: 'text-gray-400' },
};

type ViewOptions = {
    ordering: 'newest' | 'oldest';
    showRead: boolean;
    unreadFirst: boolean;
};

export default function InboxPage() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [entityDetail, setEntityDetail] = useState<any>(null);
    const [entityActivity, setEntityActivity] = useState<any[]>([]);
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
    const [allUsers, setAllUsers] = useState<any[]>([]);

    const supabase = createClient();

    useEffect(() => {
        let channel: ReturnType<typeof supabase.channel> | null = null;

        async function initializeInbox(userOverride?: any) {
            try {
                let user = userOverride;
                if (!user) {
                    const { data: { session } } = await supabase.auth.getSession();
                    user = session?.user;
                }
                
                setCurrentUser(user);
                if (user) {
                    fetchNotifications(user.id);
                    
                    if (channel) supabase.removeChannel(channel);

                    channel = supabase
                        .channel('inbox-realtime')
                        .on(
                            'postgres_changes',
                            { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
                            () => fetchNotifications(user.id)
                        )
                        .subscribe();
                }
            } catch (err: any) {
                if (err?.message?.includes('Lock broken')) return;
                console.error('Inbox auth error:', err);
            }
        }

        initializeInbox();
        
        // Fetch users for property updates
        supabase.from('users').select('id, name').order('name').then(({ data }) => {
            if (data) setAllUsers(data);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                initializeInbox(session?.user);
            }
        });

        return () => {
            if (channel) supabase.removeChannel(channel);
            subscription.unsubscribe();
        };
    }, []);

    async function fetchNotifications(userId: string) {
        const { data, error } = await supabase
            .from('notifications')
            .select(`
                *,
                actor:actor_id(id, name, email, avatar_url)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (!error) {
            setNotifications(data || []);
            // Auto-select first notification if none selected
            if (!selectedId && data && data.length > 0) {
                setSelectedId(data[0].id);
                fetchEntityDetail(data[0]);
            }
        }
        setLoading(false);
    }

    async function fetchEntityDetail(notification: any) {
        if (!notification?.entity_id) return;
        
        setDetailLoading(true);
        setEntityDetail(null);
        setEntityActivity([]);

        try {
            if (notification.entity_type === 'ticket') {
                const [ticketRes, commentsRes, logsRes] = await Promise.all([
                    supabase
                        .from('tickets')
                        .select(`
                            *,
                            projects (id, project_name),
                            created_by_user: users!created_by(id, name, email, avatar_url),
                            assigned_to_user: users!assignee_id(id, name, email, avatar_url)
                        `)
                        .eq('id', notification.entity_id)
                        .maybeSingle(),
                    supabase
                        .from('comments')
                        .select('*, users(id, name, email, avatar_url)')
                        .eq('ticket_id', notification.entity_id)
                        .order('created_at', { ascending: true }),
                    supabase
                        .from('logs')
                        .select('*, users(id, name)')
                        .eq('ticket_id', notification.entity_id)
                        .order('created_at', { ascending: true })
                ]);

                if (ticketRes.error) {
                    console.error('[Inbox] Ticket fetch error:', ticketRes.error);
                    // Fallback to simpler fetch if join failed
                    const fallback = await supabase
                        .from('tickets')
                        .select('*, projects(id, project_name)')
                        .eq('id', notification.entity_id)
                        .maybeSingle();
                    
                    if (fallback.data) {
                        setEntityDetail({ type: 'ticket', data: fallback.data });
                    }
                } else if (ticketRes.data) {
                    setEntityDetail({ type: 'ticket', data: ticketRes.data });
                }

                const activity = [
                    ...(commentsRes.data || []).map(c => ({ ...c, activityType: 'comment' })),
                    ...(logsRes.data || []).map(l => ({ ...l, activityType: 'log' })),
                ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                setEntityActivity(activity);

            } else if (notification.entity_type === 'project') {
                const { data, error } = await supabase
                    .from('projects')
                    .select('*, lead:users!lead_id(id, name, email, avatar_url)')
                    .eq('id', notification.entity_id)
                    .maybeSingle();

                if (error) {
                    console.error('[Inbox] Project fetch error:', error);
                    // Fallback to simple fetch
                    const fallback = await supabase
                        .from('projects')
                        .select('*')
                        .eq('id', notification.entity_id)
                        .maybeSingle();
                    
                    if (fallback.data) {
                        setEntityDetail({ type: 'project', data: fallback.data });
                    }
                } else if (data) {
                    setEntityDetail({ type: 'project', data });
                }
            } else {
                console.warn('[Inbox] Unhandled entity type:', notification.entity_type);
            }
        } catch (err) {
            console.error('[Inbox] Unexpected error in fetchEntityDetail:', err);
        } finally {
            setDetailLoading(false);
        }
    }

    const filteredAndSorted = useMemo(() => {
        let result = [...notifications];

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

    const selectedNotification = notifications.find(n => n.id === selectedId);

    function handleSelect(notification: any) {
        setSelectedId(notification.id);
        fetchEntityDetail(notification);
        // Auto-mark as read
        if (!notification.is_read) {
            markAsRead(notification.id);
            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
        }
    }

    const handleMarkAllRead = async () => {
        await markAllAsRead();
        if (currentUser) fetchNotifications(currentUser.id);
        setShowActions(false);
    };

    const handleDeleteAll = async () => {
        if (confirm('Are you sure you want to delete ALL notifications?')) {
            await deleteAllNotifications();
            if (currentUser) fetchNotifications(currentUser.id);
            setSelectedId(null);
            setEntityDetail(null);
            setShowActions(false);
        }
    };

    const handleDeleteRead = async () => {
        await deleteAllReadNotifications();
        if (currentUser) fetchNotifications(currentUser.id);
        setShowActions(false);
    };

    const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await deleteNotification(id);
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (selectedId === id) {
            setSelectedId(null);
            setEntityDetail(null);
        }
    };

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
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
                            <Loader2 className="animate-spin text-indigo-600" size={24} />
                            <p className="text-xs font-medium">Loading inbox...</p>
                        </div>
                    ) : filteredAndSorted.length > 0 ? (
                        filteredAndSorted.map((notification) => (
                            <NotificationRow 
                                key={notification.id} 
                                notification={notification} 
                                selected={selectedId === notification.id}
                                onSelect={() => handleSelect(notification)}
                                onDelete={(e: React.MouseEvent) => handleDeleteNotification(e, notification.id)}
                            />
                        ))
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

                        {/* Detail Content */}
                        <div className="flex-1 overflow-y-auto">
                            {detailLoading ? (
                                <div className="flex items-center justify-center h-64">
                                    <Loader2 className="animate-spin text-indigo-500" size={24} />
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
                                        
                                        {/* Due Date (keep static for now in this row or integrate into PropertyInlineRow) */}
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
                            ) : (
                                <div className="flex items-center justify-center h-64 text-gray-400">
                                    <p className="text-sm">Could not load details for this notification.</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function NotificationRow({ notification, selected, onSelect, onDelete }: any) {
    const actor = notification.actor
    
    return (
        <button
            onClick={onSelect}
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
                    <span>{formatDistanceToNow(new Date(notification.created_at), { addSuffix: false })}</span>
                </div>
            </div>
        </button>
    )
}

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
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
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
