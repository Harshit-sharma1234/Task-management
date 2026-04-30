'use client';

import { useState } from 'react';
import { Link as LinkIcon, Share2, MoreHorizontal, Check, Trash2, ExternalLink, Pencil } from 'lucide-react';
import { deleteIssue } from '@/app/dashboard/[workspace]/issues/actions';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';

interface IssueHeaderActionsProps {
  ticketId: string;
  canDelete: boolean;
}

export function IssueHeaderActions({ ticketId, canDelete }: IssueHeaderActionsProps) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const params = useParams();
  const workspaceSlug = params?.workspace as string;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/dashboard/${workspaceSlug}/issues/${ticketId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    toast.custom((t) => (
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-5 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-xl max-w-sm w-full animate-in slide-in-from-top-4 duration-300">
        <div className="flex items-start gap-4">
          <div className="bg-white/10 p-3 rounded-xl border border-white/10">
            <Trash2 size={20} className="text-red-200" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold tracking-tight mb-1">Confirm Delete</h3>
            <p className="text-xs text-indigo-100 leading-relaxed mb-4">
              Are you sure you want to delete this issue? This action is permanent and cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  toast.dismiss(t);
                  setIsDeleting(true);
                  deleteIssue(ticketId).then(result => {
                    if (result.success) {
                      router.push(`/dashboard/${workspaceSlug}/issues`);
                      router.refresh();
                    } else {
                      toast.error(result.error || 'Failed to delete issue');
                      setIsDeleting(false);
                    }
                  });
                }}
                className="flex-1 bg-white text-indigo-700 py-2 rounded-lg text-xs font-bold hover:bg-red-50 hover:text-red-600 transition-all active:scale-95 shadow-lg shadow-black/10"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => toast.dismiss(t)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-all border border-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    ), { duration: 10000, position: 'top-center' });
  };

  return (
    <div className="flex items-center gap-2 relative">
      <button
        onClick={handleCopyLink}
        className="p-2 text-gray-400 hover:bg-gray-50 rounded-md transition-colors"
        title="Copy Link"
      >
        {copied ? <Check size={16} className="text-green-500" /> : <LinkIcon size={16} />}
      </button>

      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={`p-2 rounded-md transition-colors ${showMenu ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:bg-gray-50'}`}
          title="More actions"
        >
          <MoreHorizontal size={16} />
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-lg z-20 py-1 flex flex-col">
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('trigger-issue-edit'));
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left font-medium"
              >
                <Pencil size={14} className="text-gray-400" />
                Edit issue
              </button>
              <button 
                onClick={() => {
                  window.open(`/dashboard/${workspaceSlug}/issues/${ticketId}`, '_blank');
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
              >
                <ExternalLink size={14} className="text-gray-400" />
                Open in new tab
              </button>

              {canDelete && (
                <>
                  <div className="h-px bg-gray-100 my-1 w-full" />
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left disabled:opacity-50"
                  >
                    <Trash2 size={14} className="text-red-500" />
                    {isDeleting ? 'Deleting...' : 'Delete issue'}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
