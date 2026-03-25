import Link from 'next/link';
import { Mail, Lock, User, AlertCircle } from 'lucide-react';
import { signup } from './actions';

export const metadata = {
  title: 'Sign up | Linear Clone',
};

export default async function Signup({ searchParams }) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--color-linear-bg)] text-[var(--color-linear-text)]">
      <div className="w-full max-w-sm p-8 rounded-lg border border-[var(--color-linear-border)] bg-[var(--color-linear-panel)] shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold mb-2">Create an account</h1>
          <p className="text-sm text-[var(--color-linear-muted)]">Start managing your tasks effectively.</p>
        </div>
        
        {resolvedSearchParams?.message && (
          <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
            <AlertCircle size={14} />
            <span>{resolvedSearchParams.message}</span>
          </div>
        )}

        <form className="space-y-4" action={signup}>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--color-linear-muted)]">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--color-linear-muted)]">
                <User size={16} />
              </div>
              <input 
                type="text" 
                name="fullName"
                required
                className="w-full pl-10 pr-3 py-2 bg-[var(--color-linear-bg)] border border-[var(--color-linear-border)] rounded-md text-sm focus:outline-none focus:border-[var(--color-linear-accent)] transition-colors"
                placeholder="John Doe"
              />
            </div>
          </div>

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
                className="w-full pl-10 pr-3 py-2 bg-[var(--color-linear-bg)] border border-[var(--color-linear-border)] rounded-md text-sm focus:outline-none focus:border-[var(--color-linear-accent)] transition-colors"
                placeholder="you@example.com"
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
                className="w-full pl-10 pr-3 py-2 bg-[var(--color-linear-bg)] border border-[var(--color-linear-border)] rounded-md text-sm focus:outline-none focus:border-[var(--color-linear-accent)] transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            className="w-full py-2 px-4 mt-6 bg-[var(--color-linear-accent)] hover:bg-[var(--color-linear-accent-hover)] text-white text-sm font-medium rounded-md transition-colors shadow-sm"
          >
            Create Account
          </button>
        </form>
        
        <div className="mt-6 text-center text-xs text-[var(--color-linear-muted)]">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--color-linear-text)] hover:text-[var(--color-linear-accent)] transition-colors">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
