'use client'

import { useState } from 'react'
import { X, UserPlus, Mail, Shield, BadgeCheck, Lock } from 'lucide-react'
import { provisionEmployee } from '@/app/dashboard/actions'

interface AddEmployeeModalProps {
    isOpen: boolean
    onClose: () => void
}

const ROLES = [
    { id: 'f1e5cb69-a296-43c7-8905-00fc99e1f5aa', name: 'Junior Developer' },
    { id: 'f660ccef-e2f5-466c-b4bd-7864576a63a6', name: 'Senior Developer' },
    { id: '2f06e25a-a784-4091-a845-c4837ba718bf', name: 'Project Manager' },
    { id: '83c755ee-b6c2-4d58-9492-ebd976d48486', name: 'Admin' },
]

export function AddEmployeeModal({ isOpen, onClose }: AddEmployeeModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    if (!isOpen) return null

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsSubmitting(true)
        setError(null)
        setSuccess(null)

        const formData = new FormData(e.currentTarget)
        const result = await provisionEmployee(formData)

        if (result.error) {
            setError(result.error)
            setIsSubmitting(false)
        } else {
            setSuccess(result.message || 'Employee provisioned successfully!')
            setIsSubmitting(false)
            // Keep open for a moment to show success, then close
            setTimeout(() => {
                onClose()
                setSuccess(null)
            }, 3000)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <UserPlus size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">Add New Employee</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2">
                            <X size={14} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                    {success && (
                        <div className="p-3 bg-green-50 border border-green-100 text-green-700 text-sm rounded-lg flex items-center gap-2">
                            <BadgeCheck size={14} className="shrink-0" />
                            <span>{success}</span>
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Name *</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                                <UserPlus size={16} />
                            </div>
                            <input 
                                type="text" 
                                name="name"
                                required
                                placeholder="e.g. Jane Cooper"
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email Address *</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                                <Mail size={16} />
                            </div>
                            <input 
                                type="email" 
                                name="email"
                                required
                                placeholder="jane@company.com"
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee ID *</label>
                            <input 
                                type="text" 
                                name="employee_id"
                                required
                                placeholder="EMP-001"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Role *</label>
                            <select 
                                name="role_id"
                                required
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                            >
                                {ROLES.map(role => (
                                    <option key={role.id} value={role.id}>{role.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex justify-between">
                            Temporary Password
                            <span className="normal-case font-normal text-gray-400">(Optional)</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                                <Lock size={16} />
                            </div>
                            <input 
                                type="text" 
                                name="password"
                                placeholder="Defaults to Welcome123!"
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none items-center justify-center flex gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Creating...
                                </>
                            ) : 'Create Account'}
                        </button>
                    </div>
                </form>

                {/* Footer Tip */}
                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-1">
                        <Shield size={10} />
                        Account will be auto-confirmed in Supabase Auth.
                    </p>
                </div>
            </div>
        </div>
    )
}
