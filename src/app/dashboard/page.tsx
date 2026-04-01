import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCachedUserProfile } from '@/lib/cache'
import { getDashboardPath } from '@/lib/roles'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const profile = await getCachedUserProfile(user.email!)
  
  if (!profile || !profile.roles?.role_name) {
    redirect('/login?message=No authorized profile found. Contact your admin.')
  }

  redirect(getDashboardPath(profile.roles.role_name))
}
