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

  console.time('login-auth');
  const authResponse = await Promise.race([
    supabase.auth.signInWithPassword(credentials),
    new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Auth Timeout')), 15000))
  ]).catch(err => ({ data: { user: null }, error: { message: 'Auth service timed out. Please check your connection or Supabase status.' } }));
  
  const { data: { user }, error } = authResponse;
  console.timeEnd('login-auth');

  if (error) {
    return { error: 'Could not authenticate user: ' + error.message }
  }

  // Check if user exists in the users table
  console.time('login-profile');
  const { data: profile } = await supabase
    .from('users')
    .select('id')
    .eq('email', credentials.email)
    .maybeSingle();
  console.timeEnd('login-profile');

  if (!profile) {
    await supabase.auth.signOut()
    return { error: 'No profile found for this email. Please sign up.' }
  }

  revalidatePath('/', 'layout')
  return redirect('/workspace')
}
