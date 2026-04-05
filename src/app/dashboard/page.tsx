import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCachedUserProfile } from '@/lib/cache'
import { getDashboardPath } from '@/lib/roles'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profile = await getCachedUserProfile(user.email!)
  if (!profile?.roles?.role_name) {
    redirect('/login?message=No authorized profile found.')
  }

  redirect(getDashboardPath(profile.roles.role_name))
}
