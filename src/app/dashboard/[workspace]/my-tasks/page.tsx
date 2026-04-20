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
import { getCachedUserProfile, getCachedWorkspaceBySlug } from '@/lib/cache';

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

  const currentUser = await getCachedUserProfile(user.email!);

  return (
    <Suspense fallback={<IssueListSkeleton />}>
      <MyTasksContent
        targetUserId={currentUser?.id || user.id}
        workspaceId={workspace.id}
        currentUser={currentUser}
      />
    </Suspense>
  );
}

async function MyTasksContent({
  targetUserId,
  workspaceId,
  currentUser,
}: {
  targetUserId: string;
  workspaceId: string;
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
    />
  );
}
