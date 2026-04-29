'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X, UserPlus, Mail, Shield, BadgeCheck, Copy, Check } from 'lucide-react'
import { createWorkspaceInvite } from '@/app/dashboard/[workspace]/team/actions'
import { toast } from 'sonner'

interface InviteMemberModalProps {
    isOpen: boolean
    onClose: () => void
    workspaceId: string
}

const ROLES = [
    { id: 'Junior Developer', label: 'Junior Developer', desc: 'Can view and update assigned tickets' },
    { id: 'Senior Developer', label: 'Senior Developer', desc: 'Can manage issues and review code' },
    { id: 'Project Manager', label: 'Project Manager', desc: 'Can manage projects and team members' },
    { id: 'Admin', label: 'Admin', desc: 'Full access to all workspace settings' },
]

export function InviteMemberModal({ isOpen, onClose, workspaceId }: InviteMemberModalProps) {
    const formRef = useRef<HTMLFormElement>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [inviteLink, setInviteLink] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    
    // Safety guard for async updates
    const requestVersionRef = useRef(0)

    const resetState = () => {
        setIsSubmitting(false)
        setError(null)
        setInviteLink(null)
        setCopied(false)
        formRef.current?.reset()
    }

    useEffect(() => {
        if (!isOpen) {
            requestVersionRef.current += 1
            resetState()
        }
    }, [isOpen])

    if (!isOpen) return null

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsSubmitting(true)
        setError(null)

        const currentVersion = requestVersionRef.current
        const formData = new FormData(e.currentTarget)
        const email = formData.get('email') as string
        const roleName = formData.get('roleName') as string

        try {
            const result = await createWorkspaceInvite(workspaceId, email, roleName)
            
            // Prevent state updates if modal was closed or re-opened
            if (currentVersion !== requestVersionRef.current) return

            if (result.error) {
                setError(result.error)
                setIsSubmitting(false)
            } else if (result.inviteLink) {
                setInviteLink(result.inviteLink)
                setIsSubmitting(false)
                toast.success('Invitation link generated!')
            }
        } catch (err) {
            if (currentVersion !== requestVersionRef.current) return
            setError('Failed to create invitation. Please try again.')
            setIsSubmitting(false)
        }
    }

    const copyToClipboard = async () => {
        if (inviteLink) {
            await navigator.clipboard.writeText(inviteLink)
            setCopied(true)
            toast.success('Link copied to clipboard')
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300" 
                onClick={onClose} 
            />
            
            <div className="relative w-full max-w-[480px] bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
                {/* Header */}
                <div className="px-8 pt-8 pb-6 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <UserPlus size={20} />
                        </div>
                        <div>
                            <h2 className="text-[17px] font-bold text-gray-900 tracking-tight">Invite Member</h2>
                            <p className="text-[12px] font-medium text-gray-500">Add people to your workspace</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {!inviteLink ? (
                    <form ref={formRef} onSubmit={handleSubmit} className="p-8 space-y-8">
                        <input type="hidden" name="workspaceId" value={workspaceId} />
                        
                        {/* Email Input */}
                        <div className="space-y-3">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest px-1">Email Address</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                                    <Mail size={18} />
                                </div>
                                <input
                                    name="email"
                                    type="email"
                                    placeholder="Enter colleague's email"
                                    required
                                    className="w-full h-14 pl-12 pr-4 bg-gray-50 border-none rounded-xl text-[14px] font-medium placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        {/* Role Selection */}
                        <div className="space-y-3">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest px-1">Assign Role</label>
                            <div className="grid grid-cols-1 gap-2">
                                {ROLES.map((role) => (
                                    <label 
                                        key={role.id}
                                        className="relative flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors border-2 border-transparent has-[:checked]:border-indigo-500/20 has-[:checked]:bg-indigo-50/30 group"
                                    >
                                        <input
                                            type="radio"
                                            name="roleName"
                                            value={role.id}
                                            defaultChecked={role.id === 'Junior Developer'}
                                            className="sr-only"
                                        />
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-has-[:checked]:bg-indigo-600 group-has-[:checked]:text-white transition-colors">
                                            {role.id === 'Admin' ? <Shield size={18} /> : <BadgeCheck size={18} />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-[14px] font-bold text-gray-900 leading-none mb-1">{role.label}</div>
                                            <div className="text-[11px] font-medium text-gray-500">{role.desc}</div>
                                        </div>
                                        <div className="w-5 h-5 rounded-full border-2 border-gray-200 group-has-[:checked]:border-indigo-600 group-has-[:checked]:bg-indigo-600 flex items-center justify-center transition-all">
                                            <div className="w-2 h-2 rounded-full bg-white opacity-0 group-has-[:checked]:opacity-100 transition-opacity" />
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 text-red-600 text-[13px] font-medium animate-in slide-in-from-top-2">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-[14px] font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 group"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>Generate Invite Link</>
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="p-8 text-center animate-in zoom-in-95 duration-500">
                        <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Check size={36} />
                        </div>
                        <h3 className="text-[20px] font-bold text-gray-900 mb-2 tracking-tight">Invite Link Ready!</h3>
                        <p className="text-[13px] font-medium text-gray-500 mb-8 max-w-[280px] mx-auto leading-relaxed">
                            Copy this link and send it to your colleague. It will expire in 7 days.
                        </p>
                        
                        <div className="relative group mb-8">
                            <input
                                readOnly
                                value={inviteLink}
                                className="w-full h-16 pl-6 pr-16 bg-gray-50 border-none rounded-2xl text-[13px] font-bold text-indigo-600 truncate"
                            />
                            <button
                                onClick={copyToClipboard}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-xl bg-white shadow-sm hover:shadow-md text-gray-400 hover:text-indigo-600 transition-all active:scale-90"
                            >
                                {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                            </button>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={resetState}
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
            </div>
        </div>
    )
}
