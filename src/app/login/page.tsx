import Link from 'next/link';
import LoginForm from './LoginForm';
import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth-server';

export const metadata = {
  title: 'Log in',
};

export default async function Login({ searchParams }: { searchParams: Promise<{ message?: string; error?: string; next?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const initialMessage = resolvedSearchParams.message || resolvedSearchParams.error;

  // Issue #15: Use the deduplicated getServerUser (middleware also guards this,
  // but this ensures SSR correctness for direct navigation)
  const user = await getServerUser();
  if (user) {
    redirect('/dashboard');
  }

  // Structured Data (JSON-LD) for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Tectome',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'Modern task management and issue tracking for high-performing engineering teams.',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-screen w-full flex items-center justify-center bg-[var(--color-linear-bg)] text-[var(--color-linear-text)]">
        <section className="w-full max-w-sm p-8 rounded-lg border border-[var(--color-linear-border)] bg-[var(--color-linear-panel)] shadow-xl">
          <header className="mb-8 text-center">
            <h1 className="text-2xl font-semibold mb-2">Log in to your workspace</h1>
            <p className="text-sm text-[var(--color-linear-muted)]">Enter your details to continue.</p>
          </header>
          
          <LoginForm 
            initialMessage={initialMessage} 
            nextUrl={resolvedSearchParams?.next}
            isError={!!resolvedSearchParams.error}
          />
          
          <div className="mt-8 text-center">
            <p className="text-xs text-[var(--color-linear-muted)]">
              Don't have an account?{' '}
              <Link href="/signup" className="text-[var(--color-linear-accent)] hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
