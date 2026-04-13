import Link from 'next/link';
import { XCircle, LogOut, Mail } from 'lucide-react';

export const metadata = {
  title: 'Onboarding Not Approved — Tectome',
};

export default function OnboardingRejectedPage() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[var(--color-linear-bg)] text-[var(--color-linear-text)]">
      <section className="w-full max-w-md p-10 rounded-lg border border-[var(--color-linear-border)] bg-[var(--color-linear-panel)] shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700 text-center">
        {/* Icon */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center">
            <XCircle size={36} className="text-red-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          Onboarding Not Approved
        </h1>
        
        <p className="text-sm text-[var(--color-linear-muted)] leading-relaxed mb-8">
          Unfortunately, your onboarding request could not be approved at this time.
          Please reach out to your team administrator for more information.
        </p>

        <div className="flex flex-col gap-3">
          <a 
            href="mailto:admin@company.com"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--color-linear-accent)] hover:bg-[var(--color-linear-accent-hover)] text-white text-sm font-medium rounded-md transition-colors shadow-sm"
          >
            <Mail size={14} />
            Contact Administrator
          </a>
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
