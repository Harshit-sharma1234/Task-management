import { notFound, redirect } from 'next/navigation';
import { IssueListSkeleton } from '@/components/dashboard/issues/IssueListSkeleton';
import { ProjectOverviewSkeleton } from '@/components/dashboard/ProjectOverviewSkeleton';
import { getProjectDetails, getProjectIssuesTickets, getProjectMetadata, getProjectResources } from './data';
import { Metadata } from 'next';
import { Suspense } from 'react';
import { ProjectTabContentShimmer } from '@/components/dashboard/ProjectTabContentShimmer';
import { getServerUser } from '@/lib/auth-server';
import dynamic from 'next/dynamic';

const ProjectOverview = dynamic(
  () => import('@/components/dashboard/ProjectOverview').then(mod => mod.ProjectOverview),
  { ssr: false, loading: () => <ProjectOverviewSkeleton /> }
);

const ProjectIssuesRealtimeTab = dynamic(
  () => import('@/components/dashboard/ProjectIssuesRealtimeTab').then(mod => mod.ProjectIssuesRealtimeTab),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 bg-[#fbfbfb] min-h-full">
        <IssueListSkeleton />
      </div>
    ),
  }
);

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

  const user = await getServerUser();
  if (!user) redirect('/login');

  const { project, projectError, members, profile, allUsers } = await getProjectDetails(id, user.email!);

  if (projectError || !project) {
    console.error('Project fetch error:', projectError);
    return notFound();
  }

  const currentMemberIds = (members as { user_id: string }[] | null)?.map(m => m.user_id) || [];

  return (
    <ProjectTabContentShimmer>
      {activeTab === 'issues' ? (
        <Suspense
          fallback={
            <div className="p-8 bg-[#fbfbfb] min-h-full">
              <IssueListSkeleton />
            </div>
          }
        >
          <ProjectIssuesTab 
            projectId={id} 
            users={allUsers || []} 
            projectName={project.project_name} 
            currentUser={profile}
          />
        </Suspense>
      ) : (
        <Suspense fallback={<ProjectOverviewSkeleton />}>
          <ProjectOverviewTab
            projectId={id}
            project={project}
            users={allUsers || []}
            currentMemberIds={currentMemberIds}
            currentUser={profile}
          />
        </Suspense>
      )}
    </ProjectTabContentShimmer>
  );
}

async function ProjectIssuesTab({
  projectId,
  users,
  projectName,
  currentUser,
}: {
  projectId: string;
  users: any[];
  projectName: string;
  currentUser: any;
}) {
  const INITIAL_LIMIT = 40;
  const TOTAL_LIMIT = 120;
  const tickets = await getProjectIssuesTickets(projectId);

  return (
    <ProjectIssuesRealtimeTab
      key={projectId}
      projectId={projectId}
      projectName={projectName}
      initialTickets={tickets}
      users={users}
      currentUser={currentUser}
      initialLimit={INITIAL_LIMIT}
      totalLimit={TOTAL_LIMIT}
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
