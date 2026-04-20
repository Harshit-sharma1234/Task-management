'use client';

import { useState } from 'react';
import { Portal } from '@/components/ui/Portal';
import { AlertCircle, X, Loader2 } from 'lucide-react';

interface DeleteWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  workspaceName: string;
}

export function DeleteWorkspaceModal({
  isOpen,
  onClose,
  onConfirm,
  workspaceName,
}: DeleteWorkspaceModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const isConfirmed = confirmText.trim().toLowerCase() === workspaceName.toLowerCase();

  const handleConfirm = async () => {
    if (!isConfirmed) return;
    setIsDeleting(true);
    try {
      await onConfirm();
    } catch (err) {
      console.error('Delete failed:', err);
      setIsDeleting(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200 ring-1 ring-slate-200">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-red-500" />
          
          <div className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <h3 className="text-2xl font-bold text-slate-900 tracking-tight mb-3">
              Delete Workspace
            </h3>
            
            <p className="text-[15px] text-slate-500 leading-relaxed font-medium mb-8">
              This action <span className="text-red-600 font-bold">cannot be undone</span>. 
              This will permanently delete the <span className="font-bold text-slate-900">{workspaceName}</span> workspace, 
              including all its projects, issues, members, and data.
            </p>

            <div className="space-y-4">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Type the workspace name to confirm
              </label>
              <input
                type="text"
                autoFocus
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={workspaceName}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[15px] font-medium focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all"
              />
            </div>
          </div>

          <div className="px-8 py-6 bg-slate-50/50 flex flex-col sm:flex-row-reverse gap-3">
            <button
              onClick={handleConfirm}
              disabled={!isConfirmed || isDeleting}
              className={`flex-1 py-3.5 px-6 rounded-2xl text-[15px] font-bold text-white transition-all shadow-xl shadow-red-100 flex items-center justify-center gap-2 ${
                isConfirmed && !isDeleting 
                ? 'bg-red-600 hover:bg-red-700 active:scale-[0.98]' 
                : 'bg-red-300 cursor-not-allowed shadow-none'
              }`}
            >
              {isDeleting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Workspace'
              )}
            </button>
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 py-3.5 px-6 rounded-2xl text-[15px] font-bold text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
