import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { WorkspaceClient } from './WorkspaceClient';

export const metadata = {
  title: 'Choose a Workspace — Tectome',
  description: 'Create a new workspace or join an existing one.',
};

export default async function WorkspacePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const adminClient = createAdminClient();

  // Get internal user profile
  const { data: userProfile } = await adminClient
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (!userProfile) redirect('/login');

  // Fetch user's existing workspace memberships
  const { data: memberships } = await adminClient
    .from('workspace_members')
    .select(`
      workspace_id,
      role_id,
      workspaces (id, name, slug),
      roles (role_name)
    `)
    .eq('user_id', userProfile.id);

  const workspaces = (memberships || []).map((m: any) => ({
    id: m.workspaces?.id,
    name: m.workspaces?.name,
    slug: m.workspaces?.slug,
    role: m.roles?.role_name,
  })).filter((w: any) => w.id);

  return <WorkspaceClient workspaces={workspaces} />;
}
