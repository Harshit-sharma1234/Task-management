'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { InboxSidebar } from '@/components/dashboard/inbox/InboxSidebar';
import { NotificationItem } from '@/components/dashboard/inbox/NotificationItem';
import { markAsRead, markAllAsRead } from '@/app/dashboard/notifications/actions';
import { Loader2, BellOff } from 'lucide-react';

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState('unread');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        fetchNotifications(user.id);
        
        // Real-time subscription
        const channel = supabase
          .channel('schema-db-changes')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              fetchNotifications(user.id);
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    }
    init();
  }, []);

  async function fetchNotifications(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*, actor:actor_id(name, email)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error) {
      setNotifications(data || []);
    }
    setLoading(false);
  }

  const handleMarkRead = async (id: string) => {
    const result = await markAsRead(id);
    if (result.success && currentUser) {
      fetchNotifications(currentUser.id);
    }
  };

  const handleMarkAllRead = async () => {
    const result = await markAllAsRead();
    if (result.success && currentUser) {
      fetchNotifications(currentUser.id);
    }
  };

  // Filtering Logic
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread') return !n.is_read;
    if (activeTab === 'mentions') return n.type === 'mention';
    if (activeTab === 'assigned') return n.type === 'assignment';
    return true; // 'all'
  });

  const counts = {
    all: notifications.length,
    unread: notifications.filter(n => !n.is_read).length,
    mentions: notifications.filter(n => n.type === 'mention').length,
    assigned: notifications.filter(n => n.type === 'assignment').length,
  };

  return (
    <div className="flex h-full bg-white overflow-hidden">
      <InboxSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        counts={counts}
        onMarkAllRead={handleMarkAllRead}
      />

      <main className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-4">
              <Loader2 className="animate-spin" size={24} />
              <p className="text-sm font-medium">Loading your inbox...</p>
            </div>
          ) : filteredNotifications.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {filteredNotifications.map((notification) => (
                <NotificationItem 
                  key={notification.id} 
                  notification={notification} 
                  onMarkRead={handleMarkRead}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-center px-6">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 ring-1 ring-gray-100">
                    <BellOff className="text-gray-300" size={24} />
                </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">All caught up!</h2>
              <p className="text-sm text-gray-500 max-w-xs">
                You don't have any {activeTab !== 'all' ? activeTab : ''} notifications at the moment.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
