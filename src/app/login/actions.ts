'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile, getDashboardPath } from '@/lib/roles'

export async function login(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const credentials = {
    email: (formData.get('email') as string).trim().toLowerCase(),
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(credentials)

  if (error) {
    return { error: 'Could not authenticate user: ' + error.message }
  }

  // Check if user exists in the users table with a role
  const profile = await getUserProfile(supabase, credentials.email)

  if (!profile) {
    await supabase.auth.signOut()
    return { error: 'No authorized profile found for this email. Contact your admin.' }
  }

  const roleName = profile.roles?.role_name
  if (!roleName) {
    await supabase.auth.signOut()
    return { error: 'No role assigned to your account. Contact your admin.' }
  }

  revalidatePath('/', 'layout')
  return redirect(getDashboardPath(roleName))
}
