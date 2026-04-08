import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notFound, redirect } from 'next/navigation';
import { ProjectOverview } from '@/components/dashboard/ProjectOverview';
import { IssuesList } from '@/components/dashboard/issues/IssuesList';
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

  const adminClient = createAdminClient();

  // Conditional Data Fetching: Tickets for this project
  let projectTickets: any[] = [];
  if (activeTab === 'issues') {
    const { data: tickets } = await adminClient
      .from('tickets')
      // Keep payload minimal for Issues list.
      .select('id, title, status, priority, assignee_id, reviewer_id, created_at, projects(id, project_name)')
      .eq('project_id', id)
      .order('created_at', { ascending: false });
    
    projectTickets = tickets || [];
  }

  // Only fetch resources when we are on the overview tab.
  let resources: any[] = [];
  if (activeTab !== 'issues') {
    const { data } = await adminClient
      .from('project_resources')
      // Resources section only needs these fields for rendering.
      .select('id, title, url')
      .eq('project_id', id)
      .order('created_at', { ascending: false });
    resources = data || [];
  }

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
