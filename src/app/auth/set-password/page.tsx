import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SetPasswordForm from './SetPasswordForm'

export default async function SetPasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Optional: Check if they already have a membership. 
  // If they do, they might have already set a password or don't need to.
  // But for now, we'll let them set it if they reached this page.

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-linear-bg)]">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--color-linear-text)]">Set your password</h1>
            <p className="text-[var(--color-linear-muted)] mt-2">
                Since you signed up with social login, set a password to allow signing in with your email in the future.
            </p>
        </div>
        
        <div className="bg-[var(--color-linear-panel)] p-8 rounded-2xl border border-[var(--color-linear-border)] shadow-xl">
            <SetPasswordForm />
        </div>
      </div>
    </div>
  )
}
