'use client';

import { useActionState, useState, useTransition } from 'react';
import { Mail, Lock, Loader2, AlertCircle, User, BadgeCheck, ShieldCheck, ArrowLeft } from 'lucide-react';
import { signup, requestOTP, verifyOTP } from './actions';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

type Step = 'email' | 'otp' | 'details';

function SubmitButton({ isPending, label = 'Create Account' }: { isPending: boolean; label?: string }) {
  return (
    <button 
      type="submit" 
      disabled={isPending}
      className="w-full py-2.5 px-4 mt-6 bg-[var(--color-linear-accent)] hover:bg-[var(--color-linear-accent-hover)] text-white text-sm font-medium rounded-md transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-white/70" />
          <span>Processing...</span>
        </>
      ) : (
        label
      )}
    </button>
  );
}

export default function SignupForm() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [isPending, startTransition] = useTransition();
  const [state, signupAction, isSignupPending] = useActionState(signup, null);
  const supabase = createClient();

  const handleSocialLogin = async (provider: 'google' | 'azure') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          scope: 'openid email profile'
        }
      },
    });
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    startTransition(async () => {
        const res = await requestOTP(email);
        if (res.error) {
            setError(res.error);
        } else {
            setStep('otp');
            toast.success('Verification code sent to your email');
        }
    });
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    startTransition(async () => {
        const res = await verifyOTP(email, otp);
        if (res.error) {
            setError(res.error);
        } else {
            setStep('details');
            toast.success('Email verified successfully');
        }
    });
  };

  return (
    <div className="space-y-6">
      {(error || state?.error) && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
          <AlertCircle size={14} className="flex-shrink-0" />
          <span>{error || state?.error}</span>
        </div>
      )}

      {step === 'email' && (
        <form className="space-y-4" onSubmit={handleRequestOTP}>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--color-linear-muted)]">Work Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--color-linear-muted)]">
                <Mail size={16} />
              </div>
              <input 
                type="email" 
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full pl-10 pr-3 py-2 bg-[var(--color-linear-bg)] border border-[var(--color-linear-border)] rounded-md text-sm focus:outline-none focus:border-[var(--color-linear-accent)] transition-colors placeholder:text-[var(--color-linear-muted)]/50"
                placeholder="jane@company.com"
              />
            </div>
          </div>
          <SubmitButton isPending={isPending} label="Send Verification Code" />
        </form>
      )}

      {step === 'email' && (
        <>
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--color-linear-border)] opacity-50"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
              <span className="bg-[var(--color-linear-panel)] px-2 text-[var(--color-linear-muted)]">Or sign up with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-md text-xs font-semibold hover:bg-gray-50 transition-all shadow-sm active:scale-[0.98]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => handleSocialLogin('azure')}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-md text-xs font-semibold hover:bg-gray-50 transition-all shadow-sm active:scale-[0.98]"
            >
              <svg className="w-4 h-4" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              Microsoft
            </button>
          </div>
        </>
      )}

      {step === 'otp' && (
        <form className="space-y-4" onSubmit={handleVerifyOTP}>
          <div className="flex items-center gap-2 mb-2">
            <button 
                type="button"
                onClick={() => setStep('email')}
                className="text-[var(--color-linear-muted)] hover:text-white transition-colors"
            >
                <ArrowLeft size={16} />
            </button>
            <span className="text-xs font-medium text-[var(--color-linear-muted)]">Verifying {email}</span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--color-linear-muted)]">Verification Code</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--color-linear-muted)]">
                <ShieldCheck size={16} />
              </div>
              <input 
                type="text" 
                name="otp"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="w-full pl-10 pr-3 py-2 bg-[var(--color-linear-bg)] border border-[var(--color-linear-border)] rounded-md text-sm tracking-[0.5em] font-mono focus:outline-none focus:border-[var(--color-linear-accent)] transition-colors placeholder:text-[var(--color-linear-muted)]/50"
                placeholder="000000"
              />
            </div>
          </div>
          <SubmitButton isPending={isPending} label="Verify Code" />
          
          <button 
            type="button"
            onClick={handleRequestOTP}
            disabled={isPending}
            className="w-full text-center text-xs text-[var(--color-linear-muted)] hover:text-[var(--color-linear-accent)] transition-colors mt-2"
          >
            Didn't receive a code? Resend
          </button>
        </form>
      )}

      {step === 'details' && (
        <form className="space-y-4" action={signupAction}>
          <input type="hidden" name="email" value={email} />
          
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--color-linear-muted)]">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--color-linear-muted)]">
                <User size={16} />
              </div>
              <input 
                type="text" 
                name="name"
                required
                autoComplete="name"
                className="w-full pl-10 pr-3 py-2 bg-[var(--color-linear-bg)] border border-[var(--color-linear-border)] rounded-md text-sm focus:outline-none focus:border-[var(--color-linear-accent)] transition-colors placeholder:text-[var(--color-linear-muted)]/50"
                placeholder="Jane Cooper"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--color-linear-muted)]">Employee ID</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--color-linear-muted)]">
                <BadgeCheck size={16} />
              </div>
              <input 
                type="text" 
                name="employee_id"
                required
                className="w-full pl-10 pr-3 py-2 bg-[var(--color-linear-bg)] border border-[var(--color-linear-border)] rounded-md text-sm focus:outline-none focus:border-[var(--color-linear-accent)] transition-colors placeholder:text-[var(--color-linear-muted)]/50"
                placeholder="EMP-001"
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--color-linear-muted)]">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--color-linear-muted)]">
                <Lock size={16} />
              </div>
              <input 
                type="password" 
                name="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full pl-10 pr-3 py-2 bg-[var(--color-linear-bg)] border border-[var(--color-linear-border)] rounded-md text-sm focus:outline-none focus:border-[var(--color-linear-accent)] transition-colors placeholder:text-[var(--color-linear-muted)]/50"
                placeholder="••••••••"
              />
            </div>
            <p className="text-[10px] text-[var(--color-linear-muted)] mt-1">Minimum 6 characters</p>
          </div>
          
          <SubmitButton isPending={isSignupPending} />
        </form>
      )}
    </div>
  );
}
