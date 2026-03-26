import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogOut } from 'lucide-react'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[var(--color-linear-bg)] text-[var(--color-linear-text)]">
      {/* Sidebar / Header placeholder */}
      <header className="border-b border-[var(--color-linear-border)] bg-[var(--color-linear-panel)] px-6 py-4 flex items-center justify-between">
        <div className="font-semibold px-2 border border-[var(--color-linear-border)] rounded shadow-sm">
          Workspace
        </div>
        
        <div className="flex gap-4 items-center">
            <span className="text-sm text-[var(--color-linear-muted)]">{data.user.user_metadata?.full_name || data.user.email}</span>
            <form action={async () => {
                'use server';
                const s = await createClient();
                await s.auth.signOut();
                redirect('/login');
            }}>
                <button type="submit" className="text-[var(--color-linear-muted)] hover:text-white transition-colors">
                    <LogOut size={16} />
                </button>
            </form>
        </div>
      </header>

      <main className="p-8">
        <h1 className="text-2xl font-bold mb-6">Hello, {data.user.user_metadata?.full_name || 'there'}!</h1>
        <p className="text-sm text-[var(--color-linear-muted)] mb-8">
            You successfully logged in. Soon, your Kanban board and tickets will appear here!
        </p>

        <div className="flex gap-4">
            <div className="bg-[var(--color-linear-panel)] border border-[var(--color-linear-border)] rounded-md flex-1 p-4 shadow-sm">
                <h3 className="text-sm font-semibold mb-2">To Do</h3>
                <div className="text-xs text-[var(--color-linear-muted)]">No tickets yet</div>
            </div>
            <div className="bg-[var(--color-linear-panel)] border border-[var(--color-linear-border)] rounded-md flex-1 p-4 shadow-sm">
                <h3 className="text-sm font-semibold mb-2">In Progress</h3>
                <div className="text-xs text-[var(--color-linear-muted)]">No tickets yet</div>
            </div>
            <div className="bg-[var(--color-linear-panel)] border border-[var(--color-linear-border)] rounded-md flex-1 p-4 shadow-sm">
                <h3 className="text-sm font-semibold mb-2">Done</h3>
                <div className="text-xs text-[var(--color-linear-muted)]">No tickets yet</div>
            </div>
        </div>
      </main>
    </div>
  )
}
