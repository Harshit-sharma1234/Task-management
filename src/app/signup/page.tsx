import Link from 'next/link';
import SignupForm from './SignupForm';

export const metadata = {
  title: 'Sign Up — Tectome',
  description: 'Create your Tectome account and request access to the platform.',
};

export default function SignupPage() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[var(--color-linear-bg)] text-[var(--color-linear-text)]">
      <section className="w-full max-w-sm p-8 rounded-lg border border-[var(--color-linear-border)] bg-[var(--color-linear-panel)] shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        <header className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--color-linear-accent)] text-white shadow-lg">
              <span className="text-lg font-extrabold">T</span>
            </div>
          </div>
          <h1 className="text-2xl font-semibold mb-2">Create your account</h1>
          <p className="text-sm text-[var(--color-linear-muted)]">Enter your details to request platform access.</p>
        </header>
        
        <SignupForm />
        
        <div className="mt-8 text-center">
          <p className="text-xs text-[var(--color-linear-muted)]">
            Already have an account?{' '}
            <Link href="/login" className="text-[var(--color-linear-accent)] hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
