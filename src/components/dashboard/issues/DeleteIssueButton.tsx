'use client';

import { Trash2 } from 'lucide-react';
import { deleteIssue } from '@/app/dashboard/[workspace]/issues/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmModal } from '../../ui/ConfirmModal';

export function DeleteIssueButton({ id }: { id: string }) {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleDelete = async () => {
    setIsDeleting(true);
    const res = await deleteIssue(id);
    if (res.success) {
      toast.success('Issue deleted successfully');
      // Redirect back to the issues list within the current workspace
      const workspaceSlug = window.location.pathname.split('/')[2];
      window.location.href = `/dashboard/${workspaceSlug}/issues`;
    } else {
      toast.error(res.error);
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <button 
        className="p-2 text-red-400 hover:bg-red-50 rounded-md transition-colors mr-2"
        title="Delete Issue"
        onClick={() => setShowDeleteModal(true)}
      >
        <Trash2 size={16} />
      </button>

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Issue"
        message="Are you sure you want to delete this issue? This action cannot be undone."
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </>
  );
}
