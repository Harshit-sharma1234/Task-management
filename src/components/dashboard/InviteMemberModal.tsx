'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X, UserPlus, Mail, Shield, BadgeCheck, Copy, Check } from 'lucide-react'
import { createWorkspaceInvite } from '@/app/dashboard/[workspace]/team/actions'
import { toast } from 'sonner'
import { validateEmail } from '@/lib/validation'

interface InviteMemberModalProps {
    isOpen: boolean
    onClose: () => void
    workspaceId: string
    isAdmin?: boolean
}

const ROLES = [
    { id: 'Junior Developer', label: 'Junior Developer' },
    { id: 'Senior Developer', label: 'Senior Developer' },
    { id: 'Project Manager', label: 'Project Manager' },
    { id: 'Admin', label: 'Admin' },
]

export function InviteMemberModal({ isOpen, onClose, workspaceId, isAdmin = false }: InviteMemberModalProps) {
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
        const email = (formData.get('email') as string || '').trim()
        const roleName = formData.get('roleName') as string

        // Validation
        const emailCheck = validateEmail(email)
        if (!emailCheck.valid) {
            setError(emailCheck.error || 'Invalid email address')
            setIsSubmitting(false)
            return
        }

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
                                {ROLES.filter(r => isAdmin || r.id !== 'Admin').map((role) => (
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
                                            <div className="text-[14px] font-bold text-gray-900 leading-none">{role.label}</div>
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
                    <div className="p-10 text-center animate-in zoom-in-95 fade-in duration-500">
                        {/* Premium Success Icon */}
                        <div className="relative w-24 h-24 mx-auto mb-8">
                            <div className="absolute inset-0 bg-green-100 rounded-[2rem] rotate-6 animate-pulse" />
                            <div className="absolute inset-0 bg-green-500 rounded-[2rem] -rotate-3 shadow-lg shadow-green-200 flex items-center justify-center text-white">
                                <Check size={40} strokeWidth={3} />
                            </div>
                        </div>

                        <h3 className="text-[24px] font-extrabold text-gray-900 mb-2 tracking-tight">Invite Link Ready!</h3>
                        <p className="text-[14px] font-medium text-gray-500 mb-10 max-w-[300px] mx-auto leading-relaxed">
                            Share this link with your colleague to grant them access to the workspace.
                        </p>
                        
                        {/* Glassmorphic Link Container */}
                        <div className="relative group mb-10">
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-[1.5rem] blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
                            <div className="relative flex items-center gap-3 p-5 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm overflow-hidden">
                                <div className="flex-1 text-left">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Invitation URL</div>
                                    <div className="text-[13px] font-bold text-indigo-600 break-all leading-relaxed pr-10">
                                        {inviteLink}
                                    </div>
                                </div>
                                <button
                                    onClick={copyToClipboard}
                                    className={`absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 ${
                                        copied 
                                        ? 'bg-green-500 text-white shadow-lg shadow-green-100 scale-105' 
                                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95'
                                    }`}
                                >
                                    {copied ? <Check size={20} /> : <Copy size={20} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                type="button"
                                onClick={resetState}
                                className="w-full h-14 bg-gray-900 text-white rounded-2xl text-[14px] font-bold hover:bg-gray-800 transition-all active:scale-[0.98] shadow-lg shadow-gray-200"
                            >
                                Invite another member
                            </button>
                            <button 
                                type="button"
                                onClick={onClose}
                                className="w-full h-14 text-[14px] font-bold text-gray-500 hover:text-gray-900 transition-colors"
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
