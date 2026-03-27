import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile, getDashboardPath } from '@/lib/roles'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Fetch all projects in the workspace/system
  const { data: projectsData } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  const projects = projectsData || []

  const profile = await getUserProfile(supabase, user.email!)

  if (!profile || !profile.roles?.role_name) {
    redirect('/login?message=No authorized profile found. Contact your admin.')
  }

  // Redirect to role-specific dashboard
  redirect(getDashboardPath(profile.roles.role_name))
}
