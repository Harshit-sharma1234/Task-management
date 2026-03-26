import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/roles'
import { Code, ListTodo, GitPullRequest, Bug } from 'lucide-react'

export default async function DevDashboard() {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data?.user) redirect('/login')

    const profile = await getUserProfile(supabase, data.user.email!)
    if (!profile || profile.roles?.role_name !== 'Developer') {
        redirect('/dashboard')
    }

    return (
        <div>
            <div className="flex items-center gap-3 mb-8">
                <h1 className="text-2xl font-bold">Welcome, {profile.name}!</h1>
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                    <Code size={12} className="inline mr-1" />
                    Developer
                </span>
            </div>

            <p className="text-sm text-[var(--color-linear-muted)] mb-2">
                Employee ID: <span className="text-[var(--color-linear-text)]">{profile.employee_id}</span>
            </p>
            <p className="text-sm text-[var(--color-linear-muted)] mb-8">
                {data.user.email}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[var(--color-linear-panel)] border border-[var(--color-linear-border)] rounded-lg p-5 shadow-sm hover:border-[var(--color-linear-accent)] transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                        <ListTodo size={18} className="text-[var(--color-linear-accent)]" />
                        <h3 className="text-sm font-semibold">My Tasks</h3>
                    </div>
                    <p className="text-xs text-[var(--color-linear-muted)]">View tasks assigned to you across all projects.</p>
                </div>

                <div className="bg-[var(--color-linear-panel)] border border-[var(--color-linear-border)] rounded-lg p-5 shadow-sm hover:border-[var(--color-linear-accent)] transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                        <GitPullRequest size={18} className="text-[var(--color-linear-accent)]" />
                        <h3 className="text-sm font-semibold">In Progress</h3>
                    </div>
                    <p className="text-xs text-[var(--color-linear-muted)]">Track your active work items and pull requests.</p>
                </div>

                <div className="bg-[var(--color-linear-panel)] border border-[var(--color-linear-border)] rounded-lg p-5 shadow-sm hover:border-[var(--color-linear-accent)] transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                        <Bug size={18} className="text-[var(--color-linear-accent)]" />
                        <h3 className="text-sm font-semibold">Bug Reports</h3>
                    </div>
                    <p className="text-xs text-[var(--color-linear-muted)]">Bugs assigned to you that need fixing.</p>
                </div>
            </div>
        </div>
    )
}
