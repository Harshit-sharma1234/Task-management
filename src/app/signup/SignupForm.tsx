'use client';

import { useActionState, useState, useTransition } from 'react';
import { Mail, Lock, Loader2, AlertCircle, User, BadgeCheck, ShieldCheck, ArrowLeft } from 'lucide-react';
import { signup, requestOTP, verifyOTP } from './actions';
import { toast } from 'sonner';

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
