'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Send, Loader2, Pencil, Trash2, Check, X } from 'lucide-react';
import { addComment, editComment, deleteComment } from '@/app/dashboard/[workspace]/issues/actions';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { createClient } from '@/lib/supabase/client';
import { useCommentsStore, Comment } from '@/lib/store/comments';
import { ConfirmModal } from '../../ui/ConfirmModal';

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
    removeComment,
    updateComment
  } = useCommentsStore();
  
  const [newComment, setNewComment] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
            attachments: newRow.attachments,
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAttachments(prev => [...prev, ...files]);
    }
    // Reset input so the same file can be picked again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      setAttachments(prev => [...prev, ...files]);
      toast.success(`Pasted ${files.length} image(s)`);
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newComment.trim();
    if ((!text && attachments.length === 0) || isSubmitting) return;

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
      },
      // attachments are harder to show optimistically without local IDs, 
      // but we can show a "Uploading..." state in the UI
      attachments: attachments.map(f => ({
        name: f.name,
        url: URL.createObjectURL(f), // Temporary local URL
        type: f.type,
        size: f.size
      }))
    };

    addCommentOptimistic(ticketId, optimisticComment);
    setNewComment('');
    const currentAttachments = [...attachments];
    setAttachments([]);
    setIsSubmitting(true);

    const formData = new FormData();
    currentAttachments.forEach(file => {
      formData.append('attachments', file);
    });

    const result = await addComment(ticketId, text, formData);

    if (result.error) {
      removeComment(ticketId, tempId);
      setNewComment(text); // Restore text on error
      setAttachments(currentAttachments); // Restore attachments
      toast.error(result.error);
    } else if (result.data) {
      // Replace with real data from DB
      replaceTempComment(ticketId, tempId, {
        ...result.data,
        users: result.data.users || optimisticComment.users
      });
    }

    setIsSubmitting(false);
  }, [newComment, attachments, isSubmitting, ticketId, currentUser, addCommentOptimistic, removeComment, replaceTempComment]);

  const handleEditStart = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditValue(comment.comment);
  };

  const handleEditCancel = () => {
    setEditingCommentId(null);
    setEditValue('');
  };

  const handleEditSave = async (commentId: string) => {
    const text = editValue.trim();
    if (!text || isActionLoading) return;

    // Optimistic update
    const originalText = comments.find(c => c.id === commentId)?.comment || '';
    updateComment(ticketId, commentId, text);
    setEditingCommentId(null);
    setIsActionLoading(commentId);

    const result = await editComment(commentId, ticketId, text);
    if (result.error) {
      // Rollback
      updateComment(ticketId, commentId, originalText);
      toast.error(result.error);
    } else {
      toast.success('Comment updated');
    }
    setIsActionLoading(null);
  };

  const handleDelete = async () => {
    if (!commentToDelete || isActionLoading) return;
    
    const commentId = commentToDelete;
    setCommentToDelete(null);

    // Optimistic delete
    const originalComment = comments.find(c => c.id === commentId);
    if (!originalComment) return;

    removeComment(ticketId, commentId);
    setIsActionLoading(commentId);

    const result = await deleteComment(commentId, ticketId);
    if (result.error) {
      // Rollback
      toast.error(result.error);
    } else {
      toast.success('Comment deleted');
    }
    setIsActionLoading(null);
  };

  // Merge comments and logs into unified activity feed
  const activity = useMemo(() => {
    const filteredLogs = initialLogs.filter(l => l.action_type !== 'commented');
    const items = [
      ...comments.map(c => ({ ...c, type: 'comment' as const })),
      ...filteredLogs.map(l => ({ ...l, type: 'log' as const }))
    ];
    return items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [comments, initialLogs]);

  const renderAttachments = (comment: Comment) => {
    if (!comment.attachments || comment.attachments.length === 0) return null;

    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {comment.attachments.map((file, idx) => {
          const isImage = file.type.startsWith('image/');
          return (
            <div key={idx} className="group/file relative max-w-[240px]">
              {isImage ? (
                <a 
                  href={file.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block rounded-lg overflow-hidden border border-gray-100 hover:border-gray-200 transition-all shadow-sm"
                >
                  <img 
                    src={file.url} 
                    alt={file.name} 
                    className="max-h-[180px] object-cover"
                  />
                </a>
              ) : (
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="p-1.5 bg-white rounded border border-gray-100">
                    <FileIcon size={14} className="text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-gray-700 truncate">{file.name}</p>
                    <p className="text-[9px] text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Download size={12} className="text-gray-400 group-hover/file:text-gray-600" />
                </a>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Unified Activity Feed */}
      <div className="space-y-7 pl-1">
        {activity.map((item) => (
          <div key={`${item.type}-${item.id}`} className={`flex gap-3 ${item.id.startsWith('temp-') ? 'opacity-70' : ''}`}>
            <div className="mt-0.5">
              <UserAvatar
                name={item.users?.name || 'User'}
                avatarUrl={item.users?.avatar_url}
                size="sm"
              />
            </div>
            <div className="flex-1 group/comment min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
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

                {/* Edit/Delete Actions */}
                {item.type === 'comment' && item.user_id === currentUser.id && !item.id.startsWith('temp-') && !editingCommentId && (
                  <div className="flex items-center gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditStart(item as Comment)}
                      className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
                      title="Edit comment"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => setCommentToDelete(item.id)}
                      className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete comment"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>

              {item.type === 'comment' && (
                <div className="text-[13px] text-gray-700 leading-snug">
                  {editingCommentId === item.id ? (
                    <div className="space-y-2 mt-1">
                      <div className="flex items-center gap-2 border border-gray-200 rounded-lg pl-3 pr-1.5 py-1 bg-white focus-within:border-gray-400 transition-all shadow-sm">
                        <input
                          type="text"
                          className="w-full bg-transparent text-[13px] text-gray-900 focus:outline-none py-1"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSave(item.id);
                            if (e.key === 'Escape') handleEditCancel();
                          }}
                        />
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditSave(item.id)}
                            className="p-1 hover:bg-blue-50 text-blue-600 rounded transition-colors"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={handleEditCancel}
                            className="p-1 hover:bg-gray-100 text-gray-400 rounded transition-colors"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400">Press Enter to save, Esc to cancel</p>
                    </div>
                  ) : (
                    <div className="relative break-words">
                      {'comment' in item ? item.comment : ''}
                      {renderAttachments(item as Comment)}
                      {isActionLoading === item.id && (
                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                          <Loader2 size={12} className="animate-spin text-gray-400" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={feedEndRef} />
      </div>

      {/* New Comment Input */}
      <div className="flex gap-3">
        <div className="mt-1">
          <UserAvatar
            name={currentUser.name}
            avatarUrl={currentUser.avatar_url}
            size="sm"
          />
        </div>
        <div className="flex-1 max-w-3xl space-y-3">
          {/* Pre-submission Attachment List */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {attachments.map((file, idx) => (
                <div key={idx} className="relative group">
                  <div className="flex items-center gap-2 pl-2 pr-1 py-1.5 bg-blue-50 border border-blue-100 rounded-lg">
                    {file.type.startsWith('image/') ? (
                      <ImageIcon size={12} className="text-blue-500" />
                    ) : (
                      <FileIcon size={12} className="text-blue-500" />
                    )}
                    <span className="text-[10px] font-medium text-blue-700 max-w-[100px] truncate">
                      {file.name}
                    </span>
                    <button
                      onClick={() => removeAttachment(idx)}
                      className="p-0.5 hover:bg-blue-100 rounded text-blue-400 hover:text-blue-600 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-center gap-2 border border-gray-200/60 rounded-xl pl-3 pr-1.5 py-1.5 focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-400 transition-all bg-white shadow-sm">
              <input
                type="text"
                placeholder="Leave a comment (paste images or use icon)..."
                className="w-full bg-transparent text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none py-1"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onPaste={handlePaste}
                disabled={isSubmitting}
              />
              
              <div className="flex items-center gap-1">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden" 
                  multiple 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Attach files"
                >
                  <Paperclip size={14} />
                </button>
                <button
                  type="submit"
                  disabled={(!newComment.trim() && attachments.length === 0) || isSubmitting}
                  className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {isSubmitting ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Send size={13} />
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!commentToDelete}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setCommentToDelete(null)}
      />
    </div>
  );
}
