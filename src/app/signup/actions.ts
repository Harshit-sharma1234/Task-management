'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const fullName = formData.get('fullName')
  
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
        data: {
            full_name: fullName,
            name: fullName
        }
    }
  }
  console.log("data", data)

  const { error } = await supabase.auth.signUp(data)
  console.log("Error", error)

  if (error) {
    redirect('/signup?message=Could not create user: ' + error.message)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
