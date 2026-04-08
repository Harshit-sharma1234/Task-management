import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { ProjectOverview } from '@/components/dashboard/ProjectOverview';
import { IssueListSkeleton } from '@/components/dashboard/issues/IssueListSkeleton';
import { ProjectOverviewSkeleton } from '@/components/dashboard/ProjectOverviewSkeleton';
import { ProjectIssuesRealtimeTab } from '@/components/dashboard/ProjectIssuesRealtimeTab';
import { getProjectDetails, getProjectIssuesTickets, getProjectMetadata, getProjectResources } from './data';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const project = await getProjectMetadata(id);
  
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

  return (
    <>
      {activeTab === 'issues' ? (
        <Suspense
          fallback={
            <div className="p-8 bg-[#fbfbfb] min-h-full">
              <IssueListSkeleton />
            </div>
          }
        >
          <ProjectIssuesTab projectId={id} users={users || []} projectName={project.project_name} />
        </Suspense>
      ) : (
        <Suspense fallback={<ProjectOverviewSkeleton />}>
          <ProjectOverviewTab
            projectId={id}
            project={project}
            users={users || []}
            currentMemberIds={currentMemberIds}
            currentUser={session?.user}
          />
        </Suspense>
      )}
    </>
  );
}

async function ProjectIssuesTab({
  projectId,
  users,
  projectName,
}: {
  projectId: string;
  users: any[];
  projectName: string;
}) {
  const tickets = await getProjectIssuesTickets(projectId);

  return (
    <ProjectIssuesRealtimeTab
      key={projectId}
      projectId={projectId}
      projectName={projectName}
      initialTickets={tickets}
      users={users}
    />
  );
}

async function ProjectOverviewTab({
  projectId,
  project,
  users,
  currentMemberIds,
  currentUser,
}: {
  projectId: string;
  project: any;
  users: any[];
  currentMemberIds: string[];
  currentUser: any;
}) {
  const resources = await getProjectResources(projectId);

  return (
    <ProjectOverview
      key={projectId}
      project={project}
      users={users}
      currentMemberIds={currentMemberIds}
      currentUser={currentUser}
      resources={resources}
    />
  );
}
