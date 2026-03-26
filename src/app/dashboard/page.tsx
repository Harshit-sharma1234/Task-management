import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile, getDashboardPath } from '@/lib/roles'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    redirect('/login')
  }

  const profile = await getUserProfile(supabase, data.user.email!)

  if (!profile || !profile.roles?.role_name) {
    redirect('/login?message=No authorized profile found. Contact your admin.')
  }

  // Redirect to role-specific dashboard
  redirect(getDashboardPath(profile.roles.role_name))
}
