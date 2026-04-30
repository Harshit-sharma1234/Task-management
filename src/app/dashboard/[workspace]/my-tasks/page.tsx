import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { MyTasksView } from '@/components/dashboard/MyTasksView';
import { IssueListSkeleton } from '@/components/dashboard/issues/IssueListSkeleton';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Tasks',
  description: 'View and manage tasks assigned to you.',
};

import { getServerUser } from '@/lib/auth-server';
import { getCachedUserProfile, getCachedWorkspaceBySlug, getCachedWorkspaceMember } from '@/lib/cache';

export default async function MyTasksPage({ params }: { params: Promise<{ workspace: string }> }) {
  const user = await getServerUser();

  if (!user) {
    redirect('/login');
  }

  const { workspace: workspaceSlug } = await params;
  const workspace = await getCachedWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    redirect('/dashboard');
  }

  const profile = await getCachedUserProfile(user.email!);
  const member = profile?.id ? await getCachedWorkspaceMember(workspace.id, profile.id) : null;
  const currentUser = profile ? { ...profile, roles: member?.roles || null } : null;

  return (
    <Suspense fallback={<IssueListSkeleton />}>
      <MyTasksContent
        targetUserId={currentUser?.id || user.id}
        workspaceId={workspace.id}
        workspaceSlug={workspaceSlug}
        currentUser={currentUser}
      />
    </Suspense>
  );
}

async function MyTasksContent({
  targetUserId,
  workspaceId,
  workspaceSlug,
  currentUser,
}: {
  targetUserId: string;
  workspaceId: string;
  workspaceSlug: string;
  currentUser: any;
}) {
  const { getCachedMyTasksDetailed } = await import('@/lib/cache');
  const { tickets, projects, users } = await getCachedMyTasksDetailed(targetUserId, workspaceId);

  return (
    <MyTasksView
      initialTickets={tickets}
      projects={projects}
      users={users}
      currentUser={currentUser}
      workspaceSlug={workspaceSlug}
      workspaceId={workspaceId}
    />
  );
}
