import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import InviteSignupForm from './InviteSignupForm';

export const metadata = {
  title: 'Create Account to Join Workspace — Tectome',
  description: 'Create your account to accept the workspace invitation and join your team.',
  // Invite-specific signup flow
};

export default async function InviteSignupPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const token = resolvedSearchParams?.token;

  if (!token) {
    redirect('/signup');
  }

  // Validate the token and get invite details
  const adminClient = createAdminClient();
  const { data: invite } = await adminClient
    .from('workspace_invites')
    .select('*, workspaces(name, slug), roles(role_name)')
    .eq('token', token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!invite) {
    return (
      <main className="min-h-screen w-full flex items-center justify-center bg-[var(--color-linear-bg)] text-[var(--color-linear-text)] p-4">
        <div className="w-full max-w-md text-center animate-in fade-in duration-500">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold mb-3">Invalid Invite</h1>
          <p className="text-[var(--color-linear-muted)] text-sm mb-8">
            This invite link is invalid or has expired. Please ask the workspace admin to send a new invite.
          </p>
          <Link 
            href="/signup" 
            className="inline-block px-6 py-2.5 bg-[var(--color-linear-accent)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            Create Account
          </Link>
        </div>
      </main>
    );
  }

  const { data: existingUser } = await adminClient
    .from('users')
    .select('id')
    .eq('email', invite.email.toLowerCase())
    .maybeSingle();

  // If account already exists, skip this page:
  // - logged-in matching user: directly continue invite acceptance
  // - not logged in / different user: force login, then continue invite acceptance
  if (existingUser) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email?.toLowerCase() === invite.email.toLowerCase()) {
      redirect(`/invite/${token}`);
    }
    redirect(`/login?next=/invite/${token}`);
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[var(--color-linear-bg)] text-[var(--color-linear-text)] p-4">
      <section className="w-full max-w-md p-8 rounded-lg border border-[var(--color-linear-border)] bg-[var(--color-linear-panel)] shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Invite Details Header */}
        <div className="mb-8 p-4 bg-[var(--color-linear-accent)]/10 rounded-xl border border-[var(--color-linear-accent)]/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-[var(--color-linear-accent)] text-white rounded-lg">
              <span className="text-xs font-semibold">INV</span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-linear-accent)]">Workspace Invitation</h2>
              <p className="text-xs text-[var(--color-linear-muted)]">You've been invited to join a team</p>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-linear-muted)]">Workspace:</span>
              <span className="font-medium text-[var(--color-linear-text)]">
                {(invite as any).workspaces?.name || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-linear-muted)]">Role:</span>
              <span className="font-medium text-[var(--color-linear-text)]">
                {(invite as any).roles?.role_name || 'Member'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-linear-muted)]">Email:</span>
              <span className="font-medium text-[var(--color-linear-text)]">{invite.email}</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-semibold mb-2">Create Account to Join</h1>
          <p className="text-sm text-[var(--color-linear-muted)]">
            You need to create an account first to accept the workspace invitation and join your team.
          </p>
        </header>

        <InviteSignupForm
          token={token}
          inviteEmail={invite.email}
          workspaceName={(invite as any).workspaces?.name || 'Unknown'}
        />
        
        {/* Login Link */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[var(--color-linear-muted)]">
            Already have an account?{' '}
            <Link href={`/login?next=/invite/${token}`} className="text-[var(--color-linear-accent)] hover:underline">
              Log in
            </Link>
          </p>
        </div>

        {/* Help Section */}
        <div className="mt-6 p-4 bg-[var(--color-linear-accent)]/5 rounded-lg border border-[var(--color-linear-accent)]/10">
          <div className="flex items-start gap-3">
            <span className="text-[var(--color-linear-accent)] mt-0.5 flex-shrink-0 text-xs font-semibold">i</span>
            <div className="text-xs">
              <p className="font-medium text-[var(--color-linear-text)] mb-1">Need help?</p>
              <p className="text-[var(--color-linear-muted)]">
                If you're having trouble creating an account or accepting the invite, please contact your workspace administrator.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
