import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { IssuesView } from '@/components/dashboard/issues/IssuesView';
import { IssueListSkeleton } from '@/components/dashboard/issues/IssueListSkeleton';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Issues',
  description: 'View and manage all issues.',
};

const INITIAL_ISSUES_LIMIT = 120;

export default async function IssuesPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const resolvedSearchParams = await searchParams;
  const filter = resolvedSearchParams.filter || 'all';

  return (
    <Suspense fallback={<IssueListSkeleton />}>
      <IssueListContent
        filter={filter}
        userEmail={user.email!}
        userId={user.id}
      />
    </Suspense>
  );
}

async function IssueListContent({ filter, userEmail, userId }: { filter: string; userEmail: string; userId: string }) {
  const supabase = await createClient();
  const { getUserProfile } = await import('@/lib/roles');
  const currentUser = await getUserProfile(supabase, userEmail, userId);

  const { getCachedIssueProjects, getCachedIssueUsers, getCachedIssuesList } = await import('@/lib/cache');

  // Fetch all required data in parallel; issues list itself is cached.
  const [ticketsRes, cachedProjects, cachedUsers] = await Promise.all([
    getCachedIssuesList(INITIAL_ISSUES_LIMIT),
    getCachedIssueProjects(),
    getCachedIssueUsers(),
  ]);

  const tickets = ticketsRes || [];
  const projects = (cachedProjects || []).map((p: any) => ({ id: p.id, name: p.project_name }));
  const users = cachedUsers || [];

  return (
    <IssuesView 
      tickets={tickets}
      projects={projects}
      users={users}
      activeFilter={filter}
      currentUser={currentUser}
    />
  );
}
