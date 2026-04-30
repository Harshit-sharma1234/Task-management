'use client'

import { useState } from 'react'
import { Mail, Lock, Key, ArrowRight, Loader2, CheckCircle2, X } from 'lucide-react'
import { requestPasswordResetOTP, verifyPasswordResetOTP, finalizePasswordReset } from './forgot-password-actions'
import { toast } from 'sonner'
import { validateEmail } from '@/lib/validation'

export function ForgotPasswordFlow({ onClose }: { onClose: () => void }) {
    const [step, setStep] = useState<'email' | 'code' | 'reset'>('email')
    const [email, setEmail] = useState('')
    const [code, setCode] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const handleRequestOTP = async (e: React.FormEvent) => {
        e.preventDefault()
        const emailCheck = validateEmail(email)
        if (!emailCheck.valid) {
            setError(emailCheck.error || 'Invalid email address')
            return
        }
        setIsLoading(true)
        setError('')
        
        const res = await requestPasswordResetOTP(email)
        if (res.error) {
            setError(res.error)
        } else {
            toast.success('Reset code sent! Valid for 5 minutes.')
            setStep('code')
        }
        setIsLoading(false)
    }

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        const res = await verifyPasswordResetOTP(email, code)
        if (res.error) {
            setError(res.error)
        } else {
            setStep('reset')
        }
        setIsLoading(false)
    }

    const handleFinalize = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters.')
            return
        }

        setIsLoading(true)
        setError('')

        const res = await finalizePasswordReset(email, code, newPassword)
        if (res.error) {
            setError(res.error)
        } else {
            toast.success('Password reset successfully! Please log in.')
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
                            {step === 'email' && <Mail size={24} />}
                            {step === 'code' && <Key size={24} />}
                            {step === 'reset' && <Lock size={24} />}
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                            {step === 'email' && 'Forgot Password?'}
                            {step === 'code' && 'Check your email'}
                            {step === 'reset' && 'Set new password'}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {step === 'email' && "Enter your email and we'll send you a 6-digit code."}
                            {step === 'code' && `We've sent a 6-digit verification code to ${email}`}
                            {step === 'reset' && 'Choose a strong password for your account.'}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold animate-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    <form onSubmit={step === 'email' ? handleRequestOTP : step === 'code' ? handleVerifyOTP : handleFinalize} className="space-y-5">
                        {step === 'email' && (
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
                        )}

                        {step === 'code' && (
                            <div className="space-y-1.5 text-center">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">6-Digit Code</label>
                                <input 
                                    type="text" 
                                    required
                                    maxLength={6}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                    className="w-full text-center text-3xl font-black tracking-[0.5em] py-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 focus:border-indigo-500 focus:bg-white focus:ring-0 outline-none transition-all placeholder:text-gray-200"
                                    placeholder="000000"
                                />
                                <button 
                                    type="button"
                                    onClick={handleRequestOTP}
                                    className="text-xs text-indigo-600 font-bold hover:underline mt-4"
                                >
                                    Resend code
                                </button>
                            </div>
                        )}

                        {step === 'reset' && (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1">New Password</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                                            <Lock size={18} />
                                        </div>
                                        <input 
                                            type="password" 
                                            required
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="8+ characters"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-1">Confirm New Password</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                                            <CheckCircle2 size={18} />
                                        </div>
                                        <input 
                                            type="password" 
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin h-5 w-5" />
                            ) : (
                                <>
                                    <span>{step === 'email' ? 'Send Reset Code' : step === 'code' ? 'Verify Code' : 'Update Password'}</span>
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
