import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/roles'
import { Shield } from 'lucide-react'
import DashboardOverview from '@/components/dashboard/Overview'

export default async function AdminDashboard() {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data?.user) redirect('/login')

    const profile = await getUserProfile(supabase, data.user.email!)
    if (!profile || profile.roles?.role_name !== 'Admin') {
        redirect('/dashboard')
    }

    return (
        <div className="flex flex-col h-full w-full">
            <div className="px-8 pt-6 pb-0 flex items-center justify-end">
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-500/15 text-red-500 border border-red-500/25 flex items-center shadow-sm">
                    <Shield size={12} className="mr-1" />
                    Admin View
                </span>
            </div>
            <DashboardOverview />
        </div>
    )
}
