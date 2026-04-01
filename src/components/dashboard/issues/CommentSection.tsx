'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { addComment } from '@/app/dashboard/issues/actions';
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
      alert(result.error || 'Failed to add comment');
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
      <div className="flex gap-4 pt-10 border-t border-gray-100">
        <UserAvatar
          name={currentUser.name}
          avatarUrl={currentUser.avatar_url}
          size="md"
        />
        <form onSubmit={handleSubmit} className="flex-1">
          <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all bg-white shadow-sm">
            <textarea
              placeholder="Leave a reply..."
              className="w-full p-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent resize-none min-h-[120px]"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={isSubmitting}
            />
            <div className="px-4 py-2 bg-gray-50/50 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold"
              >
                {isSubmitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <Send size={14} />
                    <span>Comment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
