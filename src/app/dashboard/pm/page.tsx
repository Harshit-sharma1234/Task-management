import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/roles'
import { Briefcase, ListTodo, Users, CalendarDays } from 'lucide-react'

export default async function PMDashboard() {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data?.user) redirect('/login')

    const profile = await getUserProfile(supabase, data.user.email!)
    if (!profile || profile.roles?.role_name !== 'Project Manager') {
        redirect('/dashboard')
    }

    return (
        <div>
            <div className="flex items-center gap-3 mb-8">
                <h1 className="text-2xl font-bold">Welcome, {profile.name}!</h1>
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
                    <Briefcase size={12} className="inline mr-1" />
                    Project Manager
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
                        <h3 className="text-sm font-semibold">My Projects</h3>
                    </div>
                    <p className="text-xs text-[var(--color-linear-muted)]">View and manage the projects assigned to you.</p>
                </div>

                <div className="bg-[var(--color-linear-panel)] border border-[var(--color-linear-border)] rounded-lg p-5 shadow-sm hover:border-[var(--color-linear-accent)] transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                        <Users size={18} className="text-[var(--color-linear-accent)]" />
                        <h3 className="text-sm font-semibold">Team Members</h3>
                    </div>
                    <p className="text-xs text-[var(--color-linear-muted)]">Assign tasks and manage your project team.</p>
                </div>

                <div className="bg-[var(--color-linear-panel)] border border-[var(--color-linear-border)] rounded-lg p-5 shadow-sm hover:border-[var(--color-linear-accent)] transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                        <CalendarDays size={18} className="text-[var(--color-linear-accent)]" />
                        <h3 className="text-sm font-semibold">Timeline</h3>
                    </div>
                    <p className="text-xs text-[var(--color-linear-muted)]">Track project deadlines and milestones.</p>
                </div>
            </div>
        </div>
    )
}
