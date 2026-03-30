'use client';

import { Trash2 } from 'lucide-react';
import { deleteIssue } from '@/app/dashboard/issues/actions';
import { useRouter } from 'next/navigation';

export function DeleteIssueButton({ id }: { id: string }) {
  const router = useRouter();
  
  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this issue?')) {
      const res = await deleteIssue(id);
      if (res.success) {
        // Use window.location as a fallback if router.push doesn't trigger refresh enough
        window.location.href = '/dashboard/issues';
      } else {
        alert(res.error);
      }
    }
  };

  return (
    <button 
      className="p-2 text-red-400 hover:bg-red-50 rounded-md transition-colors mr-2"
      title="Delete Issue"
      onClick={handleDelete}
    >
      <Trash2 size={16} />
    </button>
  );
}
