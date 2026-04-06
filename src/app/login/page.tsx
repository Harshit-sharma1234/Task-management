import Link from 'next/link';
import LoginForm from './LoginForm';
import { createClient } from '@/lib/supabase/client';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Log in',
};

export default async function Login({ searchParams }: { searchParams: { message: string } }) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (data.user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--color-linear-bg)] text-[var(--color-linear-text)]">
      <div className="w-full max-w-sm p-8 rounded-lg border border-[var(--color-linear-border)] bg-[var(--color-linear-panel)] shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold mb-2">Log in to your workspace</h1>
          <p className="text-sm text-[var(--color-linear-muted)]">Enter your details to continue.</p>
        </div>
        
        <LoginForm initialMessage={resolvedSearchParams?.message} />
        
        <div className="mt-8 text-center">
          <p className="text-xs text-[var(--color-linear-muted)]">
            Don't have an account?{' '}
            <Link href="/signup" className="text-[var(--color-linear-accent)] hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
