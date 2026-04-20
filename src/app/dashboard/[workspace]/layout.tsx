import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { getServerUser } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { LoadingProgress } from '@/components/dashboard/LoadingProgress';
import { DashboardToaster } from '@/components/dashboard/DashboardToaster';
import { GlobalDataSync } from '@/components/dashboard/GlobalDataSync';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function WorkspaceDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: workspaceSlug } = await params;
  
  const user = await getServerUser();
  if (!user) redirect('/login');

  const adminClient = createAdminClient();

  // 1. Get internal user profile (single source of truth for dashboard)
  const { data: userProfile } = await adminClient
    .from('users')
    .select('id, name, avatar_url')
    .eq('auth_id', user.id)
    .single();

  if (!userProfile) redirect('/login');

  // 2. Resolve workspace by slug
  const { data: workspace } = await adminClient
    .from('workspaces')
    .select('id, name, slug')
    .eq('slug', workspaceSlug)
    .single();

  if (!workspace) redirect('/workspace');

  // 3. Verify membership & get role
  const { data: membership } = await adminClient
    .from('workspace_members')
    .select('role_id, roles(role_name)')
    .eq('workspace_id', workspace.id)
    .eq('user_id', userProfile.id)
    .single();

  if (!membership) redirect('/workspace');

  const roleName = (membership as any).roles?.role_name || '';

  // 4. Fetch workspace-scoped data for hydration
  const [projectsRes, teamRes, unreadRes, allWorkspacesRes] = await Promise.all([
    adminClient
      .from('projects')
      .select('id, project_name, description, status, priority, lead_id, start_date, created_at')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false }),
    adminClient
      .from('workspace_members')
      .select('user_id, users(id, name, email, avatar_url), roles(role_name)')
      .eq('workspace_id', workspace.id),
    adminClient
      .from('notifications')
      .select('id', { count: 'estimated', head: true })
      .eq('user_id', userProfile.id)
      .eq('workspace_id', workspace.id)
      .eq('is_read', false),
    adminClient
      .from('workspace_members')
      .select('workspace_id, workspaces(id, name, slug), roles(role_name)')
      .eq('user_id', userProfile.id),
  ]);

  const team = (teamRes.data || []).map((m: any) => ({
    ...m.users,
    roles: m.roles,
  }));

  const availableWorkspaces = (allWorkspacesRes.data || []).map((m: any) => ({
    id: m.workspaces?.id,
    name: m.workspaces?.name,
    slug: m.workspaces?.slug,
    role: m.roles?.role_name,
  })).filter((w: any) => w.id);

  const snapshot = {
    projects: projectsRes.data || [],
    team,
    profile: { 
      id: userProfile.id,
      name: userProfile.name || user.user_metadata?.full_name || user.email,
      email: user.email!,
      avatar_url: userProfile.avatar_url || user.user_metadata?.avatar_url || null,
      roles: { role_name: roleName },
    },
    userId: user.id,
    unreadCount: unreadRes.count || 0,
    activeWorkspaceId: workspace.id,
  };

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <DashboardToaster />
      <GlobalDataSync initialData={snapshot} />
      <LoadingProgress />
      <Sidebar 
        userId={user.id} 
        userRole={roleName}
        workspaceName={workspace.name}
        workspaceSlug={workspace.slug}
        availableWorkspaces={availableWorkspaces}
        activeWorkspaceId={workspace.id}
        profileData={{
          name: snapshot.profile.name || '',
          email: snapshot.profile.email,
          avatar_url: snapshot.profile.avatar_url,
          role: roleName,
        }}
      />
      <div className="flex-1 flex flex-col min-w-0 bg-[#fbfbfb]">
        <Header 
          userId={user.id} 
          email={user.email!} 
          workspaceSlug={workspaceSlug}
          profileData={{
            name: snapshot.profile.name || '',
            email: snapshot.profile.email,
            avatar_url: snapshot.profile.avatar_url,
            role: roleName,
          }} 
        />
        <main className="flex-1 overflow-y-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
