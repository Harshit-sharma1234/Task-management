'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { login } from './actions';
import { ForgotPasswordFlow } from './ForgotPasswordFlow';

function SubmitButton({ isPending }: { isPending: boolean }) {
  return (
    <button 
      type="submit" 
      disabled={isPending}
      className="w-full py-2 px-4 mt-6 bg-[var(--color-linear-accent)] hover:bg-[var(--color-linear-accent-hover)] text-white text-sm font-medium rounded-md transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-white/70" />
          <span>Signing in...</span>
        </>
      ) : (
        'Continue'
      )}
    </button>
  );
}

export default function LoginForm({ initialMessage }: { initialMessage?: string }) {
  const [state, formAction, isPending] = useActionState(login, null);
  const [showForgot, setShowForgot] = useState(false);
  const router = useRouter();

  const errorMessage = state?.error || initialMessage;

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
          <AlertCircle size={14} className="flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form className="space-y-4" action={formAction}>
        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--color-linear-muted)]">Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--color-linear-muted)]">
              <Mail size={16} />
            </div>
            <input 
              type="email" 
              name="email"
              required
              autoComplete="email"
              className="w-full pl-10 pr-3 py-2 bg-[var(--color-linear-bg)] border border-[var(--color-linear-border)] rounded-md text-sm focus:outline-none focus:border-[var(--color-linear-accent)] transition-colors placeholder:[var(--color-linear-muted)]"
              placeholder="you@example.com"
            />
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[var(--color-linear-muted)]">Password</label>
            <button 
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-[10px] font-bold text-[var(--color-linear-accent)] hover:underline"
            >
                Forgot password?
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--color-linear-muted)]">
              <Lock size={16} />
            </div>
            <input 
              type="password" 
              name="password"
              required
              autoComplete="current-password"
              className="w-full pl-10 pr-3 py-2 bg-[var(--color-linear-bg)] border border-[var(--color-linear-border)] rounded-md text-sm focus:outline-none focus:border-[var(--color-linear-accent)] transition-colors placeholder:[var(--color-linear-muted)]"
              placeholder="••••••••"
            />
          </div>
        </div>
        
        <SubmitButton isPending={isPending} />
      </form>

      {showForgot && <ForgotPasswordFlow onClose={() => setShowForgot(false)} />}
    </div>
  );
}
