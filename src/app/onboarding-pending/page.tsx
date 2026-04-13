import Link from 'next/link';
import { Clock, LogOut } from 'lucide-react';

export const metadata = {
  title: 'Onboarding In Progress — Tectome',
};

export default function OnboardingPendingPage() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[var(--color-linear-bg)] text-[var(--color-linear-text)]">
      <section className="w-full max-w-md p-10 rounded-lg border border-[var(--color-linear-border)] bg-[var(--color-linear-panel)] shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700 text-center">
        {/* Animated icon */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
              <Clock size={36} className="text-amber-500" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 animate-pulse" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          Onboarding In Progress
        </h1>
        
        <p className="text-sm text-[var(--color-linear-muted)] leading-relaxed mb-2">
          Your account has been created and is now under review.
        </p>
        <p className="text-sm text-[var(--color-linear-muted)] leading-relaxed mb-8">
          An administrator will assign your role shortly. You&apos;ll receive an email at your registered address once your access is approved.
        </p>

        {/* Status indicators */}
        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-semibold text-green-700">Account created</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-semibold text-amber-700">Waiting for admin approval</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
            <div className="w-2 h-2 rounded-full bg-slate-300" />
            <span className="text-xs font-semibold text-slate-400">Role assignment &amp; platform access</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Link 
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-md transition-colors"
          >
            <LogOut size={14} />
            Back to Login
          </Link>
        </div>
      </section>
    </main>
  );
}
