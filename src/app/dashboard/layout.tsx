import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogOut } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-linear-bg)] text-[var(--color-linear-text)]">
      <nav className="border-b border-[var(--color-linear-border)] bg-[var(--color-linear-panel)] px-6 py-4 flex items-center justify-between">
        <div className="font-semibold px-3 py-1 border border-[var(--color-linear-border)] rounded shadow-sm text-sm">
          Workspace
        </div>
        <form action={async () => {
          'use server';
          const s = await createClient();
          await s.auth.signOut();
          redirect('/login');
        }}>
          <button type="submit" className="flex items-center gap-2 text-sm text-[var(--color-linear-muted)] hover:text-white transition-colors">
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </form>
      </nav>
      <main className="flex-1 flex flex-col p-8">
        {children}
      </main>
    </div>
  );
}
