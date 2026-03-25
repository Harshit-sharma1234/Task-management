'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function signup(formData) {
  const supabase = await createClient()

  const fullName = formData.get('fullName')
  
  const data = {
    email: formData.get('email'),
    password: formData.get('password'),
    options: {
        data: {
            full_name: fullName
        }
    }
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    redirect('/signup?message=Could not create user: ' + error.message)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
