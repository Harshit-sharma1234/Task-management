import { redirect } from 'next/navigation'
import { getDashboardPath } from '@/lib/roles'
import { getServerUser, getServerProfile } from '@/lib/auth-server'

export default async function Dashboard() {
  const user = await getServerUser();

  if (!user) redirect('/login');

  const profile = await getServerProfile(user.email!);
  if (!profile?.roles?.role_name) {
    redirect('/login?message=No authorized profile found.')
  }

  redirect(getDashboardPath(profile.roles.role_name))
}
