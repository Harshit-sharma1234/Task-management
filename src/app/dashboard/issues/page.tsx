import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { IssuesView } from '@/components/dashboard/issues/IssuesView';
import { IssueListSkeleton } from '@/components/dashboard/issues/IssueListSkeleton';
import { Metadata } from 'next';
import { getUserProfile } from '@/lib/roles';
import { getCachedIssueProjects, getCachedIssueUsers, getCachedIssuesList } from '@/lib/cache';

export const metadata: Metadata = {
  title: 'Issues',
  description: 'View and manage all issues.',
};

const INITIAL_ISSUES_LIMIT = 120;

import { getServerUser } from '@/lib/auth-server';

export default async function IssuesPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const user = await getServerUser();

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
  
  // Fetch all required data in parallel including user profile
  const [ticketsRes, cachedProjects, cachedUsers, currentUser] = await Promise.all([
    getCachedIssuesList(INITIAL_ISSUES_LIMIT),
    getCachedIssueProjects(),
    getCachedIssueUsers(),
    getUserProfile(supabase, userEmail, userId)
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
