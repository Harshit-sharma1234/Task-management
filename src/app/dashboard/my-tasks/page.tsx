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

import { getServerUser, getServerProfile } from '@/lib/auth-server';

export default async function MyTasksPage() {
  const user = await getServerUser();

  if (!user) {
    redirect('/login');
  }

  const currentUser = await getServerProfile(user.email!);
  const targetUserId = currentUser?.id || user.id;

  return (
    <Suspense fallback={<IssueListSkeleton />}>
      <MyTasksContent targetUserId={targetUserId} currentUser={currentUser} />
    </Suspense>
  );
}

async function MyTasksContent({
  targetUserId,
  currentUser,
}: {
  targetUserId: string;
  currentUser: any;
}) {
  const { getCachedMyTasksDetailed } = await import('@/lib/cache');
  const { tickets, projects, users } = await getCachedMyTasksDetailed(targetUserId);

  return (
    <MyTasksView 
      initialTickets={tickets}
      projects={projects}
      users={users}
      currentUser={currentUser}
    />
  );
}
