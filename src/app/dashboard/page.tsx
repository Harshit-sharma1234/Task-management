import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRolePath } from '@/lib/role-utils'

/**
 * Catch-all /dashboard route.
 * Resolves the user's last workspace and redirects to the correct workspace-scoped dashboard.
 */
export default async function Dashboard() {
  const user = await getServerUser();
  if (!user) redirect('/login');

  const adminClient = createAdminClient();

  // Get internal user profile — query id first (always exists)
  const { data: userProfile } = await adminClient
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  if (!userProfile) redirect('/login');

  // Try to get last_workspace_id (may not exist if migration hasn't run)
  let lastWorkspaceId: string | null = null;
  try {
    const { data: lwData } = await adminClient
      .from('users')
      .select('last_workspace_id')
      .eq('id', userProfile.id)
      .single();
    lastWorkspaceId = lwData?.last_workspace_id || null;
  } catch { /* column may not exist yet */ }

  // Get memberships
  const { data: memberships } = await adminClient
    .from('workspace_members')
    .select('workspace_id, role_id, workspaces(slug), roles(role_name)')
    .eq('user_id', userProfile.id);

  if (!memberships || memberships.length === 0) {
    redirect('/workspace');
  }

  // Prefer last visited workspace
  let target = memberships[0];
  if (lastWorkspaceId) {
    const lastVisited = memberships.find((m: any) => m.workspace_id === lastWorkspaceId);
    if (lastVisited) target = lastVisited;
  }

  const slug = (target as any).workspaces?.slug || 'default';
  const roleName = (target as any).roles?.role_name || 'Junior Developer';
  const rolePath = getRolePath(roleName);

  redirect(`/dashboard/${slug}/${rolePath}`);
}

