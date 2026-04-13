'use client'

import { useState } from 'react'
import { Check, X, Loader2, UserCheck, ChevronDown, AlertCircle } from 'lucide-react'
import { approveOnboarding, rejectOnboarding } from './actions'
import { formatDistanceToNow } from 'date-fns'

const ROLES = [
    { id: 'f1e5cb69-a296-43c7-8905-00fc99e1f5aa', name: 'Junior Developer' },
    { id: 'f660ccef-e2f5-466c-b4bd-7864576a63a6', name: 'Senior Developer' },
    { id: '2f06e25a-a784-4091-a845-c4837ba718bf', name: 'Project Manager' },
    { id: '83c755ee-b6c2-4d58-9492-ebd976d48486', name: 'Admin' },
]

interface OnboardingRequest {
    id: string
    status: string
    requested_at: string
    users: {
        id: string
        name: string
        email: string
        employee_id: string
    }
}

interface OnboardingQueueProps {
    initialRequests: OnboardingRequest[]
}

export default function OnboardingQueue({ initialRequests }: OnboardingQueueProps) {
    const [requests, setRequests] = useState<OnboardingRequest[]>(initialRequests)
    const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({})
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null)
    const [rejectModalId, setRejectModalId] = useState<string | null>(null)
    const [rejectReason, setRejectReason] = useState('')

    async function handleApprove(requestId: string) {
        const roleId = selectedRoles[requestId]
        if (!roleId) {
            setFeedback({ type: 'error', message: 'Please select a role before approving.' })
            return
        }

        setLoadingId(requestId)
        setFeedback(null)

        const result = await approveOnboarding(requestId, roleId)

        if (result.error) {
            setFeedback({ type: 'error', message: result.error })
        } else {
            setFeedback({ type: 'success', message: result.message || 'Approved successfully!' })
            setRequests(prev => prev.filter(r => r.id !== requestId))
        }
        setLoadingId(null)
    }

    async function handleReject(requestId: string) {
        setLoadingId(requestId)
        setFeedback(null)

        const result = await rejectOnboarding(requestId, rejectReason || undefined)

        if (result.error) {
            setFeedback({ type: 'error', message: result.error })
        } else {
            setFeedback({ type: 'success', message: 'Request rejected.' })
            setRequests(prev => prev.filter(r => r.id !== requestId))
        }
        setLoadingId(null)
        setRejectModalId(null)
        setRejectReason('')
    }

    if (requests.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-green-50 border-2 border-green-100 flex items-center justify-center mb-4">
                    <UserCheck size={28} className="text-green-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-1">All caught up!</h3>
                <p className="text-sm text-slate-400">No pending onboarding requests.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Feedback banner */}
            {feedback && (
                <div className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300 ${
                    feedback.type === 'success' 
                        ? 'bg-green-50 border border-green-100 text-green-700' 
                        : 'bg-red-50 border border-red-100 text-red-700'
                }`}>
                    {feedback.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                    {feedback.message}
                </div>
            )}

            {/* Requests list */}
            <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="text-left px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employee</th>
                            <th className="text-left px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</th>
                            <th className="text-left px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employee ID</th>
                            <th className="text-left px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Requested</th>
                            <th className="text-left px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assign Role</th>
                            <th className="text-right px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map((req) => {
                            const employee = req.users
                            const isLoading = loadingId === req.id
                            return (
                                <tr key={req.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                                {employee?.name?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                            <span className="text-sm font-semibold text-slate-800">{employee?.name || 'Unknown'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{employee?.email || '—'}</td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                                            {employee?.employee_id || '—'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-400">
                                        {req.requested_at 
                                            ? formatDistanceToNow(new Date(req.requested_at), { addSuffix: true })
                                            : '—'
                                        }
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="relative">
                                            <select
                                                value={selectedRoles[req.id] || ''}
                                                onChange={(e) => setSelectedRoles(prev => ({ ...prev, [req.id]: e.target.value }))}
                                                className="w-full appearance-none px-3 py-2 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all"
                                            >
                                                <option value="">Select role...</option>
                                                {ROLES.map(role => (
                                                    <option key={role.id} value={role.id}>{role.name}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleApprove(req.id)}
                                                disabled={isLoading || !selectedRoles[req.id]}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                                            >
                                                {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => setRejectModalId(req.id)}
                                                disabled={isLoading}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
                                            >
                                                <X size={12} />
                                                Reject
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Reject Modal */}
            {rejectModalId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Reject Request</h3>
                        <p className="text-sm text-slate-500 mb-4">Optionally provide a reason for rejection.</p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason (optional)"
                            rows={3}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-400 transition-all resize-none mb-4"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setRejectModalId(null); setRejectReason('') }}
                                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleReject(rejectModalId)}
                                disabled={loadingId === rejectModalId}
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loadingId === rejectModalId ? <Loader2 size={14} className="animate-spin" /> : null}
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
