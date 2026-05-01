'use client'

import { useState, useRef, useEffect } from 'react'
import { X, AlertTriangle, Trash2, Loader2, ShieldCheck } from 'lucide-react'
import { UserAvatar } from '@/components/ui/UserAvatar'

interface DeleteMemberModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (message: string) => Promise<void>
    userName: string
    userEmail: string
    avatarUrl?: string | null
}

export function DeleteMemberModal({ isOpen, onClose, onConfirm, userName, userEmail, avatarUrl }: DeleteMemberModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState('')
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
            await onConfirm(message);
        } finally {
            setIsSubmitting(false);
            onClose();
            setMessage(''); // Reset message after use
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
                    <h2 className="text-xl font-bold text-gray-900">Remove team member?</h2>
                    <p className="text-sm text-red-600/80 font-medium mt-1">They will lose all access to this workspace</p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-left">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Member to remove</div>
                        <div className="flex items-center justify-start gap-3">
                            <div className="flex-shrink-0">
                                <UserAvatar
                                    name={userName || 'User'}
                                    avatarUrl={avatarUrl}
                                    size="lg"
                                />
                            </div>
                            <div className="flex flex-col min-w-0 text-left items-start">
                                <span className="text-[14px] font-bold text-gray-900 truncate w-full leading-tight">
                                    {userName || 'User'}
                                </span>
                                <span className="text-[11px] text-gray-500 font-medium truncate w-full mt-0.5">
                                    {userEmail}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Message Field */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Message to member</label>
                            <span className="text-[10px] text-gray-400 font-medium">Optional</span>
                        </div>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Add a reason or personal note... (this will be sent via email)"
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all resize-none min-h-[100px]"
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="flex gap-2 text-[12px] text-gray-600 leading-relaxed">
                            <ShieldCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                            <span>This will remove their access to all projects and tasks.</span>
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
                                    Removing...
                                </>
                            ) : (
                                <>
                                    <Trash2 size={16} />
                                    Remove member
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
