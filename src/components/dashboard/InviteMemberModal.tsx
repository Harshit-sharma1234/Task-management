'use client'

import { useEffect, useRef, useState } from 'react'
import { X, UserPlus, Mail, Shield, BadgeCheck, Copy, Check } from 'lucide-react'
import { createWorkspaceInvite } from '@/app/dashboard/[workspace]/team/actions'
import { toast } from 'sonner'

interface InviteMemberModalProps {
    isOpen: boolean
    onClose: () => void
    workspaceId: string
}

const ROLES = [
    { id: 'f1e5cb69-a296-43c7-8905-00fc99e1f5aa', name: 'Junior Developer' },
    { id: 'f660ccef-e2f5-466c-b4bd-7864576a63a6', name: 'Senior Developer' },
    { id: '2f06e25a-a784-4091-a845-c4837ba718bf', name: 'Project Manager' },
    { id: '83c755ee-b6c2-4d58-9492-ebd976d48486', name: 'Admin' },
]

export function InviteMemberModal({ isOpen, onClose, workspaceId }: InviteMemberModalProps) {
    const formRef = useRef<HTMLFormElement>(null)

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [inviteLink, setInviteLink] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    const resetModalState = () => {
        setIsSubmitting(false)
        setError(null)
        setInviteLink(null)
        setCopied(false)
        formRef.current?.reset()
    }

    useEffect(() => {
        if (!isOpen) {
            resetModalState()
        }
    }, [isOpen])

    if (!isOpen) return null

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsSubmitting(true)
        setError(null)
        setInviteLink(null)

        const formData = new FormData(e.currentTarget)
        const email = formData.get('email') as string
        const roleId = formData.get('role_id') as string
        
        try {
            const result = await createWorkspaceInvite(workspaceId, email, roleId)
            
            if (result.error) {
                setError(result.error)
                setIsSubmitting(false)
            } else {
                setInviteLink(result.inviteLink || null)
                setIsSubmitting(false)
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create invite')
            setIsSubmitting(false)
        }
    }

    const copyToClipboard = async () => {
        if (!inviteLink) return
        try {
            await navigator.clipboard.writeText(inviteLink)
            setCopied(true)
            toast.success('Link copied to clipboard')
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            toast.error('Failed to copy link')
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                            <UserPlus size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 leading-tight">Invite Member</h2>
                            <p className="text-xs text-gray-400 font-medium">Add someone to your workspace</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {!inviteLink ? (
                    <form ref={formRef} onSubmit={handleSubmit} className="p-8 space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl flex items-center gap-3 animate-in shake duration-300">
                                <X size={16} className="shrink-0" />
                                <span className="font-medium">{error}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Email Address</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                                    <Mail size={18} />
                                </div>
                                <input 
                                    type="email" 
                                    name="email"
                                    required
                                    placeholder="jane@company.com"
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[15px] font-medium focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all shadow-inner"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Assign Role</label>
                            <div className="relative">
                                <select 
                                    name="role_id"
                                    required
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-[15px] font-medium focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all shadow-inner appearance-none cursor-pointer"
                                >
                                    {ROLES.map(role => (
                                        <option key={role.id} value={role.id}>{role.name}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                                    <Shield size={18} />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 flex gap-4">
                            <button 
                                type="button" 
                                onClick={onClose}
                                className="flex-1 px-6 py-4 bg-white border border-gray-200 text-gray-600 text-[14px] font-bold rounded-2xl hover:bg-gray-50 hover:text-gray-900 transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="flex-1 px-6 py-4 bg-indigo-600 text-white text-[14px] font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Inviting...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Send Invite</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="p-10 text-center space-y-6 animate-in zoom-in-95 duration-500">
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                            <BadgeCheck size={40} />
                        </div>
                        
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-gray-900 lowercase first-letter:uppercase">Invite generated!</h3>
                            <p className="text-[13px] text-gray-500 font-medium">An invitation email has been sent. You can also share the link manually below.</p>
                        </div>

                        <div className="relative group">
                            <input 
                                readOnly
                                value={inviteLink}
                                className="w-full pl-5 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[13px] font-mono text-gray-600 outline-none select-all"
                            />
                            <button 
                                onClick={copyToClipboard}
                                className="absolute right-2 top-2 p-2 bg-white text-gray-400 hover:text-indigo-600 rounded-xl border border-gray-100 shadow-sm transition-all hover:scale-105 active:scale-95"
                            >
                                {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                            </button>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={resetModalState}
                                className="flex-1 py-4 text-[14px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                            >
                                Invite another member
                            </button>
                            <button 
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-4 text-[14px] font-bold text-gray-500 hover:text-gray-900 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer */}
                {!inviteLink && (
                    <div className="px-8 py-5 bg-gray-50/50 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-2 font-bold uppercase tracking-widest">
                            <Shield size={12} className="text-indigo-400/50" />
                            Invite link expires in 7 days
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
