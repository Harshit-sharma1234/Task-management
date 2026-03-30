'use client';

import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, UserPlus, Zap, FileText, Check } from 'lucide-react';
import Link from 'next/link';

interface Notification {
  id: string;
  type: 'assignment' | 'comment' | 'mention' | 'status_change' | 'project_update';
  message: string;
  is_read: boolean;
  created_at: string;
  entity_type: 'ticket' | 'project';
  entity_id: string;
  actor: {
    name: string;
    email: string;
  };
}

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
}

export function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const Icon = {
    assignment: UserPlus,
    comment: MessageSquare,
    mention: AtSign,
    status_change: Zap,
    project_update: FileText,
  }[notification.type] || Bell;

  const typeLabel = {
    assignment: 'Assignment',
    comment: 'New Comment',
    mention: 'Mention',
    status_change: 'Status Update',
    project_update: 'Project Update',
  }[notification.type];

  // Map entity to dashboard link
  const link = notification.entity_type === 'ticket' 
    ? `/dashboard/issues/${notification.entity_id}`
    : `/dashboard/projects/${notification.entity_id}`;

  return (
    <div 
      className={`group relative flex items-start gap-4 p-5 transition-all border-b border-gray-50 hover:bg-gray-50/50 ${
        !notification.is_read ? 'bg-white shadow-[0_0_15px_rgba(79,70,229,0.03)]' : ''
      }`}
    >
      {/* Unread Indicator */}
      {!notification.is_read && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 rounded-full" />
      )}

      {/* Actor Avatar */}
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0 border border-white shadow-sm ring-1 ring-gray-100">
        {notification.actor.name?.charAt(0).toUpperCase() || 'U'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">{notification.actor.name}</span>
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              {typeLabel}
            </span>
          </div>
          <span className="text-[11px] text-gray-400 font-medium">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </span>
        </div>

        <Link href={link} className="block group/link">
          <p className={`text-sm leading-relaxed mb-2 ${
            !notification.is_read ? 'text-gray-900 font-medium' : 'text-gray-600'
          }`}>
            {notification.message}
          </p>
        </Link>

        <div className="flex items-center gap-4">
          <Link 
            href={link}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors"
          >
            <Icon size={12} />
            View {notification.entity_type}
          </Link>
          
          {!notification.is_read && (
            <button
              onClick={() => onMarkRead(notification.id)}
              className="text-[11px] font-bold text-gray-400 hover:text-green-600 flex items-center gap-1.5 px-2 py-0.5 rounded transition-all opacity-0 group-hover:opacity-100"
            >
              <Check size={12} />
              Mark as read
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Re-using Icon/AtSign from previous plan
import { Bell, AtSign } from 'lucide-react';
