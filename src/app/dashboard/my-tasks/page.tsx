import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { MyTasksView } from '@/components/dashboard/MyTasksView';
import { IssueListSkeleton } from '@/components/dashboard/issues/IssueListSkeleton';

export const dynamic = 'force-dynamic';

export default async function MyTasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <Suspense fallback={<IssueListSkeleton />}>
      <MyTasksContent userId={user.id} />
    </Suspense>
  );
}

async function MyTasksContent({ userId }: { userId: string }) {
  const supabase = await createClient();

  // Fetch only assigned tickets (My Tasks)
  const { data: ticketsRes } = await supabase
    .from('tickets')
    .select('id, title, status, priority, assignee_id, created_by, created_at, projects(id, project_name)')
    .eq('assignee_id', userId)
    .order('created_at', { ascending: false });

  const [projectsRes, usersRes] = await Promise.all([
    supabase.from('projects').select('id, project_name'),
    supabase.from('users').select('id, name')
  ]);

  const tickets = ticketsRes || [];
  const projects = (projectsRes.data || []).map(p => ({ id: p.id, name: p.project_name }));
  const users = usersRes.data || [];

  return (
    <MyTasksView 
      initialTickets={tickets}
      projects={projects}
      users={users}
    />
  );
}
