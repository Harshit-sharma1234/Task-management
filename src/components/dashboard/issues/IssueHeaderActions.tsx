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
    if (!confirm('Are you sure you want to delete this issue? This cannot be undone.')) return;

    setIsDeleting(true);
    const result = await deleteIssue(ticketId);
    if (result.success) {
      router.push(`/dashboard/${workspaceSlug}/issues`);
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to delete issue');
      setIsDeleting(false);
    }
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
