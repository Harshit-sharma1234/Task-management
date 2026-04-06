import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notFound, redirect } from 'next/navigation';
import { ProjectOverview } from '@/components/dashboard/ProjectOverview';
import { IssuesList } from '@/components/dashboard/issues/IssuesList';
import { getUserProfile } from '@/lib/roles';
import { getProjectDetails } from './data';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  // We can't easily get the session here without duplicating more boilerplate, 
  // but we can query the project name using the service or let getProjectDetails pull it.
  // Actually, createAdminClient is easiest for metadata if we don't want to pass session.
  const adminClient = createAdminClient();
  const { data: project } = await adminClient.from('projects').select('project_name, description').eq('id', id).single();
  
  if (!project) return { title: 'Project Not Found' };
  
  return {
    title: project.project_name,
    description: project.description || `View tasks and details for ${project.project_name}`,
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function ProjectDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab = tab || 'overview';
  
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { project, projectError, users, members } = await getProjectDetails(id, session.user.email!, session.user.id);

  if (projectError || !project) {
    console.error('Project fetch error:', projectError);
    return notFound();
  }

  const currentMemberIds = (members as { user_id: string }[] | null)?.map(m => m.user_id) || [];

  // Fetch user role for visibility control
  const profile = await getUserProfile(supabase, session.user.email!, session.user.id);
  const userRole = profile?.roles?.role_name || null;

  // Conditional Data Fetching: Tickets for this project
  let projectTickets: any[] = [];
  if (activeTab === 'issues') {
    const { data: tickets } = await adminClient
      .from('tickets')
      .select('id, title, status, priority, assignee_id, attachments, created_at, projects(id, project_name, status), assignees:users!assignee_id(id, name, avatar_url)')
      .eq('project_id', id)
      .order('created_at', { ascending: false });
    
    projectTickets = tickets || [];
  }

  // Fetch project resources
  const { data: resources } = await adminClient
    .from('project_resources')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  return (
    <>
      {activeTab === 'issues' ? (
        <div className="p-8 bg-[#fbfbfb] min-h-full">
          <IssuesList 
            tickets={projectTickets} 
            users={users || []}
            emptyMessage={`No issues found for ${project.project_name}`} 
          />
        </div>
      ) : (
        <ProjectOverview 
          project={project} 
          users={users || []} 
          currentMemberIds={currentMemberIds} 
          currentUser={session?.user}
          resources={resources || []}
        />
      )}
    </>
  );
}
