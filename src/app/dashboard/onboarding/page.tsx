import { redirect } from 'next/navigation'
import { getServerUser, getServerProfile } from '@/lib/auth-server'
import { fetchPendingOnboardingRequests } from './actions'
import OnboardingQueue from './OnboardingQueue'
import { UserCheck } from 'lucide-react'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Onboarding Approval — Tectome',
}

export const revalidate = 30

export default async function OnboardingPage() {
    const user = await getServerUser()
    if (!user) redirect('/login')

    const profile = await getServerProfile(user.email!)
    if (!profile || !['Admin', 'Project Manager'].includes(profile.roles?.role_name || '')) {
        redirect('/dashboard')
    }

    const result = await fetchPendingOnboardingRequests()
    // Normalize: Supabase returns FK as array, flatten to single object
    const requests = (result.data || []).map((req: any) => ({
        ...req,
        users: Array.isArray(req.users) ? req.users[0] : req.users,
    }))

    return (
        <div className="flex flex-col h-full w-full p-10 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                            <UserCheck size={22} />
                        </div>
                        Employee Onboarding
                    </h1>
                    <p className="text-[14px] font-medium text-slate-500 mt-2">
                        Review and approve new employee signup requests.
                    </p>
                </div>
                {requests.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-xs font-bold text-amber-700">
                            {requests.length} pending {requests.length === 1 ? 'request' : 'requests'}
                        </span>
                    </div>
                )}
            </div>

            {/* Queue */}
            <OnboardingQueue initialRequests={requests} />
        </div>
    )
}
