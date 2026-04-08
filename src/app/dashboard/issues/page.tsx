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

export const dynamic = 'force-dynamic';

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

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminClient = createAdminClient();
  const { getCachedIssueProjects, getCachedIssueUsers } = await import('@/lib/cache');

  // We use adminClient to show ALL issues as requested for this global view
  let query = adminClient
    .from('tickets')
    // List view only needs a small subset; keep payload minimal for faster loads.
    .select('id, title, status, priority, assignee_id, reviewer_id, created_at, projects(id, project_name), assignees:users!assignee_id(id, name, avatar_url)')
    .order('created_at', { ascending: false });

  // Fetch all required data in parallel using adminClient for global view
  const [ticketsRes, cachedProjects, cachedUsers] = await Promise.all([
    query.limit(200),
    getCachedIssueProjects(),
    getCachedIssueUsers(),
  ]);

  const tickets = ticketsRes.data || [];
  const projects = (cachedProjects || []).map((p: any) => ({ id: p.id, name: p.project_name }));
  const users = cachedUsers || [];

  if (ticketsRes.error) console.error('Error fetching tickets:', ticketsRes.error);

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
