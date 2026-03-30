import Link from 'next/link';
import { Mail, Lock, User, AlertCircle, Shield } from 'lucide-react';
import { signup } from './actions';

export const metadata = {
  title: 'Sign up | Linear Clone',
};

export default async function Signup({ searchParams }: { searchParams: { message: string } }) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--color-linear-bg)] text-[var(--color-linear-text)]">
      <div className="w-full max-w-sm p-10 rounded-2xl border border-[var(--color-linear-border)] bg-[var(--color-linear-panel)] shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-center">
        <div className="mb-8">
          <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
            <Shield size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-3 tracking-tight">Access Restricted</h1>
          <p className="text-sm text-[var(--color-linear-muted)] leading-relaxed">
            This workspace is currently <span className="text-[var(--color-linear-text)] font-semibold">Invitation Only</span>. 
            New accounts must be provisioned by an administrator.
          </p>
        </div>
        
        <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl mb-8">
            <p className="text-xs text-[var(--color-linear-muted)] leading-normal">
                Please contact your team lead or IT administrator to receive your login credentials.
            </p>
        </div>
        
        <div className="pt-6 border-t border-[var(--color-linear-border)]">
          <p className="text-xs text-[var(--color-linear-muted)] mb-4">Already have an account?</p>
          <Link 
            href="/login" 
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--color-linear-text)] text-[var(--color-linear-bg)] text-sm font-bold rounded-xl hover:scale-105 transition-all shadow-lg active:scale-95"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

