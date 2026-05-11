import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { getServerUser } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { LoadingProgress } from '@/components/dashboard/LoadingProgress';
import { DashboardToaster } from '@/components/dashboard/DashboardToaster';
import { GlobalDataSync } from '@/components/dashboard/GlobalDataSync';
import { GlobalShortcutManager } from '@/components/dashboard/GlobalShortcutManager';
import { createAdminClient } from '@/lib/supabase/admin';
import { LayoutWrapper } from '@/components/dashboard/LayoutWrapper';

export default async function WorkspaceDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: workspaceSlug } = await params;
  const adminClient = createAdminClient();
  
  // 1. & 2. Get user and workspace in parallel
  const [user, { data: workspace }] = await Promise.all([
    getServerUser(),
    adminClient.from('workspaces').select('id, name, slug').eq('slug', workspaceSlug).single()
  ]);

  if (!user) redirect('/login');
  if (!workspace) redirect('/workspace?from=layout_missing_workspace');

  // 3. & 4. Resolve everything else in parallel
  const [userProfileRes, allWorkspacesRes, projectsRes, teamRes, unreadRes] = await Promise.all([
    adminClient.from('users').select('id, name, avatar_url').eq('auth_id', user.id).single(),
    adminClient.from('workspace_members').select('workspace_id, workspaces(id, name, slug), roles(role_name)').eq('user_id', user.id), 
    adminClient.from('projects').select('id, project_name, description, status, priority, lead_id, start_date, workspace_id, created_at, lead:users!lead_id(id, name, avatar_url)').eq('workspace_id', workspace.id).order('created_at', { ascending: false }),
    adminClient.from('workspace_members').select('user_id, users(id, name, email, avatar_url), roles(role_name)').eq('workspace_id', workspace.id),
    adminClient.from('notifications').select('id', { count: 'estimated', head: true }).eq('user_id', user.id).eq('workspace_id', workspace.id).eq('is_read', false),
  ]);

  const userProfile = userProfileRes.data;
  if (!userProfile) redirect('/login');

  // Now verify membership specifically for this workspace
  const { data: membership } = await adminClient
    .from('workspace_members')
    .select('role_id, roles(role_name)')
    .eq('workspace_id', workspace.id)
    .eq('user_id', userProfile.id)
    .single();

  if (!membership) redirect('/workspace?from=layout_missing_membership');

  const rolesData = (membership as any).roles;
  const roleName = (Array.isArray(rolesData) ? rolesData[0]?.role_name : rolesData?.role_name) || '';

  const team = (teamRes.data || []).map((m: any) => {
    const user = Array.isArray(m.users) ? m.users[0] : m.users;
    const role = Array.isArray(m.roles) ? m.roles[0] : m.roles;
    return {
      ...user,
      roles: { role_name: role?.role_name },
    };
  }).filter(u => u.id);

  const availableWorkspaces = (allWorkspacesRes.data || []).map((m: any) => {
    const ws = Array.isArray(m.workspaces) ? m.workspaces[0] : m.workspaces;
    const role = Array.isArray(m.roles) ? m.roles[0] : m.roles;
    return {
      id: ws?.id,
      name: ws?.name,
      slug: ws?.slug,
      role: role?.role_name,
    };
  }).filter((w: any) => w.id);

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
    userId: userProfile.id,
    unreadCount: unreadRes.count || 0,
    activeWorkspaceId: workspace.id,
  };

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <DashboardToaster />
      <GlobalDataSync key={workspace.id} initialData={snapshot} />
      <GlobalShortcutManager 
        workspaceSlug={workspace.slug} 
        workspaceId={workspace.id}
        userRole={roleName}
      />
      <LoadingProgress />
      <Sidebar 
        userId={user.id} 
        userRole={roleName}
        workspaceName={workspace.name}
        workspaceSlug={workspace.slug}
        availableWorkspaces={availableWorkspaces}
        activeWorkspaceId={workspace.id}
        initialUnreadCount={snapshot.unreadCount}
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
      }
      globalSync={<GlobalDataSync key={workspace.id} initialData={snapshot} />}
    >
      {children}
    </LayoutWrapper>
  );
}
