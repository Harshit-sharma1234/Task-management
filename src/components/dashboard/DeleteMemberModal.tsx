'use client'

import { useState, useRef, useEffect } from 'react'
import { X, AlertTriangle, Trash2, Loader2, ShieldCheck } from 'lucide-react'

interface DeleteMemberModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => Promise<void>
    userName: string
    userEmail: string
}

export function DeleteMemberModal({ isOpen, onClose, onConfirm, userName, userEmail }: DeleteMemberModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const modalRef = useRef<HTMLDivElement>(null)

    // Click outside logic
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsSubmitting(true);
        try {
            await onConfirm();
        } finally {
            setIsSubmitting(false);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div 
                ref={modalRef}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200"
            >
                {/* Warning Header */}
                <div className="bg-red-50 px-6 py-6 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 ring-8 ring-red-50">
                        <AlertTriangle size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Delete team member?</h2>
                    <p className="text-sm text-red-600/80 font-medium mt-1">This action cannot be undone</p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Member to remove</div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                {userName?.[0] || userEmail?.[0] || 'U'}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-900">{userName || 'User'}</span>
                                <span className="text-xs text-gray-500 font-medium">{userEmail}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex gap-2 text-[13px] text-gray-600 leading-relaxed">
                            <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                            <span>This will remove their access to all projects and tasks.</span>
                        </div>
                        <div className="flex gap-2 text-[13px] text-gray-600 leading-relaxed">
                            <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                            <span>All records they created will be preserved but detached.</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button 
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleConfirm}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 size={16} />
                                    Delete member
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
