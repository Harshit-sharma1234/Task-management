'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { addComment } from '@/app/dashboard/issues/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  users: {
    name: string;
    email: string;
    avatar_url?: string | null;
  };
}

interface CommentSectionProps {
  ticketId: string;
  comments: Comment[];
  currentUser: {
    name: string;
    email: string;
    avatar_url?: string | null;
  };
  hideList?: boolean;
}

export function CommentSection({ ticketId, comments, currentUser, hideList = false }: CommentSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const result = await addComment(ticketId, newComment);
    
    if (result.success) {
      setNewComment('');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to add comment');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-8">
      {/* Comments List */}
      {!hideList && (
        <div className="space-y-10">
          {comments.map((c) => (
            <div key={c.id} className="group">
              <div className="flex gap-4">
                <UserAvatar
                  name={c.users?.name || 'User'}
                  avatarUrl={c.users?.avatar_url}
                  size="md"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-gray-900 leading-none">{c.users?.name}</span>
                    <span className="text-xs text-gray-400 leading-none">
                      {c.users?.email} • {new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed bg-gray-50/50 rounded-lg p-4 border border-gray-100/50">
                    {c.comment}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
