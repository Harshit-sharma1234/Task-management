import Link from 'next/link';
import { PlusCircle, Users, ArrowRight, LayoutGrid } from 'lucide-react';

export const metadata = {
  title: 'Choose a Workspace — Tectome',
  description: 'Create a new workspace or join an existing one to start managing your projects.',
};

export default function WorkspacePage() {
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-[var(--color-linear-bg)] text-[var(--color-linear-text)] p-4">
      <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        <header className="mb-12 text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--color-linear-accent)] text-white shadow-xl shadow-[var(--color-linear-accent)]/20">
              <span className="text-xl font-extrabold">T</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3 text-gradient">
            Welcome to Tectome
          </h1>
          <p className="text-[var(--color-linear-muted)] max-w-md mx-auto text-lg">
            Choose how you want to start. You can create a new workspace for your team or join an existing one.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Create Workspace Option */}
          <Link 
            href="/create-workspace"
            className="group premium-card p-8 rounded-2xl flex flex-col items-start gap-6 hover:border-[var(--color-linear-accent)]/50"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:bg-[var(--color-linear-accent)] group-hover:text-white transition-all duration-300">
              <PlusCircle size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                Create a new workspace
                <ArrowRight size={18} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
              </h2>
              <p className="text-sm text-[var(--color-linear-muted)] leading-relaxed">
                Set up a new space for your projects, team members, and workflows. You'll be the workspace owner.
              </p>
            </div>
            <div className="mt-auto pt-4 flex items-center gap-2 text-xs font-semibold text-[var(--color-linear-accent)]">
              <span>GET STARTED</span>
              <div className="h-px flex-1 bg-[var(--color-linear-border)]"></div>
            </div>
          </Link>

          {/* Join Workspace Option */}
          <Link 
            href="/join-workspace"
            className="group premium-card p-8 rounded-2xl flex flex-col items-start gap-6 hover:border-[var(--color-linear-accent)]/50"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center group-hover:bg-[var(--color-linear-accent)] group-hover:text-white transition-all duration-300">
              <Users size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                Join an existing team
                <ArrowRight size={18} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
              </h2>
              <p className="text-sm text-[var(--color-linear-muted)] leading-relaxed">
                Already have an invite? Enter your workspace code or search for your team to request access.
              </p>
            </div>
            <div className="mt-auto pt-4 flex items-center gap-2 text-xs font-semibold text-[var(--color-linear-accent)]">
              <span>EXPLORE TEAMS</span>
              <div className="h-px flex-1 bg-[var(--color-linear-border)]"></div>
            </div>
          </Link>
        </div>

        <footer className="mt-16 text-center border-t border-[var(--color-linear-border)] pt-8">
          <p className="text-xs text-[var(--color-linear-muted)]">
            Log out of your account?{' '}
            <form action="/auth/signout" method="post" className="inline">
              <button type="submit" className="text-[var(--color-linear-accent)] hover:underline font-medium">
                Sign out
              </button>
            </form>
          </p>
        </footer>
      </div>
    </main>
  );
}
