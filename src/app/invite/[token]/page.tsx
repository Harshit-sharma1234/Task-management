import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { AcceptInviteClient } from './AcceptInviteClient';

export const metadata = {
  title: 'Accept Invite — Tectome',
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If not logged in, redirect to login with return URL
  if (!user) {
    redirect(`/login?next=/invite/${token}`);
  }

  const adminClient = createAdminClient();

  // Validate the token
  const { data: invite } = await adminClient
    .from('workspace_invites')
    .select('*, workspaces(name, slug), roles(role_name)')
    .eq('token', token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!invite) {
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center bg-[var(--color-linear-bg)] text-[var(--color-linear-text)] p-4">
        <div className="w-full max-w-md text-center animate-in fade-in duration-500">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold mb-3">Invalid Invite</h1>
          <p className="text-[var(--color-linear-muted)] text-sm mb-8">
            This invite link is invalid or has expired. Please ask the workspace admin to send a new invite.
          </p>
          <a href="/workspace" className="inline-block px-6 py-2.5 bg-[var(--color-linear-accent)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">
            Go to Workspaces
          </a>
        </div>
      </main>
    );
  }

  // Get user profile to check email match
  const { data: userProfile } = await adminClient
    .from('users')
    .select('id, email')
    .eq('auth_id', user.id)
    .single();

  const emailMatch = userProfile?.email?.toLowerCase() === invite.email.toLowerCase();

  return (
    <AcceptInviteClient 
      invite={{
        id: invite.id,
        token,
        workspaceName: (invite as any).workspaces?.name || 'Unknown',
        workspaceSlug: (invite as any).workspaces?.slug || 'default',
        roleName: (invite as any).roles?.role_name || 'Member',
        email: invite.email,
      }}
      emailMatch={emailMatch}
      userEmail={userProfile?.email || user.email || ''}
    />
  );
}
