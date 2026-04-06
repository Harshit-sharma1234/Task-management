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
  const { data: { user } } = await supabase.auth.getUser();
  const { getUserProfile } = await import('@/lib/roles');
  const currentUser = user ? await getUserProfile(supabase, user.email!, user.id) : null;

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminClient = createAdminClient();

  // Fetch only assigned tickets (My Tasks) with full details matching Issues page
  const { data: ticketsRes } = await adminClient
    .from('tickets')
    .select('id, title, status, priority, assignee_id, reviewer_id, created_by, created_at, attachments, projects(id, project_name), assignees:users!assignee_id(id, name, avatar_url)')
    .eq('assignee_id', userId)
    .order('created_at', { ascending: false });

  const [projectsRes, usersRes] = await Promise.all([
    adminClient.from('projects').select('id, project_name').order('project_name'),
    adminClient.from('users').select('id, name, avatar_url, roles(role_name)').order('name')
  ]);

  const tickets = ticketsRes || [];
  const projects = (projectsRes.data || []).map(p => ({ id: p.id, name: p.project_name }));
  const users = usersRes.data || [];

  return (
    <MyTasksView 
      initialTickets={tickets}
      projects={projects}
      users={users}
      currentUser={currentUser}
    />
  );
}
