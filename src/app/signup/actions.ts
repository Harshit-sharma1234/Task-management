'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile, getDashboardPath } from '@/lib/roles'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = (formData.get('email') as string).trim().toLowerCase()
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

  // Check if user is pre-provisioned in the users table
  const profile = await getUserProfile(supabase, email)

  if (!profile) {
    redirect('/signup?message=Your email is not authorized. Contact your admin to get access.')
  }

  // User exists in the users table — proceed with Supabase auth signup
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        name: fullName,
      },
    },
  })

  if (error) {
    redirect('/signup?message=Could not create account: ' + error.message)
  }

  const roleName = profile.roles?.role_name

  revalidatePath('/', 'layout')
  redirect(roleName ? getDashboardPath(roleName) : '/dashboard')
}
