import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { IssuesView } from '@/components/dashboard/issues/IssuesView';
import { IssueListSkeleton } from '@/components/dashboard/issues/IssueListSkeleton';

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
      <IssueListContent filter={filter} />
    </Suspense>
  );
}

async function IssueListContent({ filter }: { filter: string }) {
  const supabase = await createClient();
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminClient = createAdminClient();

  // We use adminClient to show ALL issues as requested for this global view
  let query = adminClient
    .from('tickets')
    .select('id, title, status, priority, assignee_id, created_at, projects(id, project_name, status), assignees:users!assignee_id(id, name, avatar_url)')
    .order('created_at', { ascending: false });

  if (filter === 'active') {
    // Show only active tickets (In Progress and Todo)
    query = query.in('status', ['in_progress', 'to_do']);
  } else if (filter === 'backlog') {
    // Show only backlog tickets
    query = query.eq('status', 'backlog');
  }

  // Fetch all required data in parallel using adminClient for global view
  const [ticketsRes, projectsRes, usersRes] = await Promise.all([
    query.limit(200),
    adminClient
      .from('projects')
      .select('id, project_name')
      .order('project_name'),
    adminClient
      .from('users')
      .select('id, name, avatar_url')
      .order('name')
  ]);

  const tickets = ticketsRes.data || [];
  const projects = (projectsRes.data || []).map(p => ({ id: p.id, name: p.project_name }));
  const users = usersRes.data || [];

  if (usersRes.error) console.error('Error fetching users:', usersRes.error);
  if (ticketsRes.error) console.error('Error fetching tickets:', ticketsRes.error);

  return (
    <IssuesView 
      tickets={tickets}
      projects={projects}
      users={users}
      activeFilter={filter}
    />
  );
}
