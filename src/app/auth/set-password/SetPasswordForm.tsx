'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, CheckCircle2, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function SetPasswordForm() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters.')
            return
        }

        setIsLoading(true)

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            })

            if (updateError) {
                setError(updateError.message)
            } else {
                toast.success('Password set successfully!')
                // Move to onboarding
                router.push('/workspace')
            }
        } catch (err) {
            setError('An unexpected error occurred.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold animate-in fade-in slide-in-from-top-1">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[var(--color-linear-muted)] uppercase tracking-widest pl-1">New Password</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[var(--color-linear-muted)]">
                            <Lock size={18} />
                        </div>
                        <input 
                            type={showPassword ? 'text' : 'password'} 
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-12 pr-12 py-3.5 bg-[var(--color-linear-bg)] border border-[var(--color-linear-border)] rounded-2xl text-sm font-medium focus:ring-4 focus:ring-[var(--color-linear-accent)]/20 focus:border-[var(--color-linear-accent)] outline-none transition-all placeholder:[var(--color-linear-muted)]"
                            placeholder="At least 8 characters"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-4 flex items-center text-[var(--color-linear-muted)] hover:text-[var(--color-linear-text)] transition-colors">
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[var(--color-linear-muted)] uppercase tracking-widest pl-1">Confirm Password</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[var(--color-linear-muted)]">
                            <CheckCircle2 size={18} />
                        </div>
                        <input 
                            type={showPassword ? 'text' : 'password'} 
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full pl-12 pr-12 py-3.5 bg-[var(--color-linear-bg)] border border-[var(--color-linear-border)] rounded-2xl text-sm font-medium focus:ring-4 focus:ring-[var(--color-linear-accent)]/20 focus:border-[var(--color-linear-accent)] outline-none transition-all placeholder:[var(--color-linear-muted)]"
                            placeholder="Repeat password"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-4 flex items-center text-[var(--color-linear-muted)] hover:text-[var(--color-linear-text)] transition-colors">
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="pt-2">
                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full py-4 bg-[var(--color-linear-accent)] hover:bg-[var(--color-linear-accent-hover)] text-white font-bold rounded-2xl shadow-xl shadow-[var(--color-linear-accent)]/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 active:scale-[0.98]"
                >
                    {isLoading ? (
                        <Loader2 className="animate-spin h-5 w-5" />
                    ) : (
                        <>
                            <span>Set Password & Continue</span>
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </div>
        </form>
    )
}
