'use client'

import { useState } from 'react'
import { Mail, ArrowRight, Loader2, X } from 'lucide-react'
import { requestPasswordResetLink } from './forgot-password-actions'
import { toast } from 'sonner'
import { validateEmail } from '@/lib/validation'

export function ForgotPasswordFlow({ onClose }: { onClose: () => void }) {
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const handleRequestResetLink = async (e: React.FormEvent) => {
        e.preventDefault()
        const emailCheck = validateEmail(email)
        if (!emailCheck.valid) {
            setError(emailCheck.error || 'Invalid email address')
            return
        }
        setIsLoading(true)
        setError('')
        
        const res = await requestPasswordResetLink(email)
        if (res.error) {
            setError(res.error)
        } else {
            toast.success('Password reset link sent! Check your email.')
            onClose()
        }
        setIsLoading(false)
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col relative animate-in zoom-in-95 duration-300">
                <button 
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all z-10"
                >
                    <X size={20} />
                </button>

                <div className="p-8">
                    <div className="mb-8">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4">
                            <Mail size={24} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                            Forgot Password?
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Enter your account email and we'll send a secure reset link. This does not change your email address.
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold animate-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleRequestResetLink} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1">Email Address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin h-5 w-5" />
                            ) : (
                                <>
                                    <span>Send Reset Link</span>
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                        
                        <button 
                            type="button"
                            onClick={onClose}
                            className="w-full py-2 text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors mt-2"
                        >
                            Back to login
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
