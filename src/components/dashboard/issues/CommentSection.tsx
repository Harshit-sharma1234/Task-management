'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { addComment } from '@/app/dashboard/issues/actions';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { createClient } from '@/lib/supabase/client';
import { useCommentsStore, Comment } from '@/lib/store/comments';

interface LogEntry {
  id: string;
  message: string;
  action_type: string;
  created_at: string;
  users: {
    id?: string;
    name: string;
    avatar_url?: string | null;
  };
}

interface CommentSectionProps {
  ticketId: string;
  initialComments: Comment[];
  initialLogs?: LogEntry[];
  currentUser: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string | null;
  };
}

export function CommentSection({ ticketId, initialComments, initialLogs = [], currentUser }: CommentSectionProps) {
  const { 
    commentsMap, 
    setInitialComments, 
    addCommentOptimistic, 
    addCommentRealtime, 
    replaceTempComment, 
    removeComment 
  } = useCommentsStore();
  
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);

  const comments = commentsMap[ticketId] || [];

  // Sync initial comments on mount or when props change
  useEffect(() => {
    setInitialComments(ticketId, initialComments);
  }, [ticketId, initialComments, setInitialComments]);

  // --- Supabase Realtime subscription ---
  useEffect(() => {
    const channel = supabase
      .channel(`comments_${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `ticket_id=eq.${ticketId}`
        },
        async (payload) => {
          const newRow = payload.new as any;

          // Fetch user info for the new realtime comment
          const { data: userData } = await supabase
            .from('users')
            .select('id, name, email, avatar_url')
            .eq('id', newRow.user_id)
            .single();

          const realtimeComment: Comment = {
            id: newRow.id,
            comment: newRow.comment,
            created_at: newRow.created_at,
            user_id: newRow.user_id,
            users: userData || { name: 'User', email: '' }
          };

          addCommentRealtime(ticketId, realtimeComment);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, supabase, addCommentRealtime]);

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newComment.trim();
    if (!text || isSubmitting) return;

    // --- Optimistic insert ---
    const tempId = `temp-${Date.now()}`;
    const optimisticComment: Comment = {
      id: tempId,
      comment: text,
      created_at: new Date().toISOString(),
      user_id: currentUser.id,
      users: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        avatar_url: currentUser.avatar_url
      }
    };

    addCommentOptimistic(ticketId, optimisticComment);
    setNewComment('');
    setIsSubmitting(true);

    const result = await addComment(ticketId, text);

    if (result.error) {
      removeComment(ticketId, tempId);
      toast.error(result.error);
    } else if (result.data) {
      // Replace with real data from DB
      replaceTempComment(ticketId, tempId, {
        ...result.data,
        users: result.data.users || optimisticComment.users
      });
    }

    setIsSubmitting(false);
  }, [newComment, isSubmitting, ticketId, currentUser, addCommentOptimistic, removeComment, replaceTempComment]);

  // Merge comments and logs into unified activity feed
  const activity = useMemo(() => {
    const filteredLogs = initialLogs.filter(l => l.action_type !== 'commented');
    const items = [
      ...comments.map(c => ({ ...c, type: 'comment' as const })),
      ...filteredLogs.map(l => ({ ...l, type: 'log' as const }))
    ];
    return items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [comments, initialLogs]);

  return (
    <div className="space-y-8">
      {/* Unified Activity Feed */}
      <div className="space-y-6 pl-1">
        {activity.map((item) => (
          <div key={`${item.type}-${item.id}`} className={`flex gap-3 ${item.id.startsWith('temp-') ? 'opacity-70' : ''}`}>
            <div className="mt-0.5">
              <UserAvatar
                name={item.users?.name || 'User'}
                avatarUrl={item.users?.avatar_url}
                size="sm"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[12px] font-bold text-gray-900">{item.users?.name}</span>
                <span className="text-[11px] font-medium text-gray-400">
                  {item.type === 'comment' ? '' : `${'message' in item ? item.message : ''} · `}
                  {new Date(item.created_at).toLocaleString('en-IN', {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                    hour12: true, timeZone: 'Asia/Kolkata'
                  })}
                  {item.id.startsWith('temp-') && ' · Sending...'}
                </span>
              </div>
              {item.type === 'comment' && (
                <div className="text-[13px] text-gray-700 leading-snug">
                  {'comment' in item ? item.comment : ''}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={feedEndRef} />
      </div>

      {/* New Comment Input */}
      <div className="flex gap-3">
        <div className="mt-0.5">
          <UserAvatar
            name={currentUser.name}
            avatarUrl={currentUser.avatar_url}
            size="sm"
          />
        </div>
        <form onSubmit={handleSubmit} className="flex-1 max-w-3xl">
          <div className="flex items-center gap-2 border border-gray-200/60 rounded-xl pl-3 pr-1.5 py-1 focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-400 transition-all bg-white shadow-sm">
            <input
              type="text"
              placeholder="Leave a comment..."
              className="w-full bg-transparent text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none py-1"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Send size={13} />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
