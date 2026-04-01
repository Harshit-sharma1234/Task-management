import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Shield } from 'lucide-react'
import DashboardOverview from '@/components/dashboard/Overview'
import OverviewSkeleton from '@/components/dashboard/OverviewSkeleton'
import { getCachedUserProfile } from '@/lib/cache'

export const revalidate = 60;

export default async function AdminDashboard() {
    const supabase = await createClient()
    const { data: authData, error } = await supabase.auth.getUser()

    if (error || !authData?.user) redirect('/login')

    return (
        <div className="flex flex-col h-full w-full">
            <div className="px-8 pt-6 pb-0 flex items-center justify-end shrink-0">
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-500/15 text-red-500 border border-red-500/25 flex items-center shadow-sm">
                    <Shield size={12} className="mr-1" />
                    Admin View
                </span>
            </div>
            
            <Suspense fallback={<OverviewSkeleton />}>
                <AdminContent email={authData.user.email!} userId={authData.user.id} userName={authData.user.user_metadata?.full_name} />
            </Suspense>
        </div>
    )
}

async function AdminContent({ email, userId, userName }: { email: string; userId: string; userName?: string }) {
    const profile = await getCachedUserProfile(email)
    
    if (!profile || profile.roles?.role_name !== 'Admin') {
        redirect('/dashboard')
    }

    return <DashboardOverview userId={userId} userName={userName || profile.name || email} />
}
