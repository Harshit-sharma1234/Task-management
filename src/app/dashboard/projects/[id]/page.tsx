import { notFound, redirect } from 'next/navigation';
import { IssueListSkeleton } from '@/components/dashboard/issues/IssueListSkeleton';
import { ProjectOverviewSkeleton } from '@/components/dashboard/ProjectOverviewSkeleton';
import { getProjectDetails, getProjectIssuesTickets, getProjectMetadata, getProjectResources } from './data';
import { Metadata } from 'next';
import { Suspense } from 'react';
import { ProjectTabContentShimmer } from '@/components/dashboard/ProjectTabContentShimmer';
import { getServerUser } from '@/lib/auth-server';
import { ProjectOverview, ProjectIssuesRealtimeTab } from '@/components/dashboard/ProjectClientWrappers';

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
  searchParams: Promise<{ tab?: string; filter?: string }>;
}

export default async function ProjectDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { tab, filter } = await searchParams;
  const activeTab = tab || 'overview';
  const activeFilter = filter || 'all';

  // 🚀 Launch massive deep-fetches instantly, bypassing the Auth/Metadata waterfall
  const ticketsPromise = activeTab === 'issues' ? getProjectIssuesTickets(id, activeFilter) : Promise.resolve([]);
  const resourcesPromise = activeTab === 'overview' ? getProjectResources(id) : Promise.resolve([]);

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
            ticketsPromise={ticketsPromise}
            activeFilter={activeFilter}
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
            resourcesPromise={resourcesPromise}
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
  ticketsPromise,
  activeFilter,
}: {
  projectId: string;
  users: any[];
  projectName: string;
  currentUser: any;
  ticketsPromise: Promise<any[]>;
  activeFilter: string;
}) {
  const INITIAL_LIMIT = 40;
  const TOTAL_LIMIT = 120;
  // 💥 Wait for the already-resolving promise
  const tickets = await ticketsPromise;

  return (
    <ProjectIssuesRealtimeTab
      key={projectId + activeFilter}
      projectId={projectId}
      projectName={projectName}
      initialTickets={tickets}
      users={users}
      currentUser={currentUser}
      initialLimit={INITIAL_LIMIT}
      totalLimit={TOTAL_LIMIT}
      initialFilter={activeFilter}
    />
  );
}

async function ProjectOverviewTab({
  projectId,
  project,
  users,
  currentMemberIds,
  currentUser,
  resourcesPromise,
}: {
  projectId: string;
  project: any;
  users: any[];
  currentMemberIds: string[];
  currentUser: any;
  resourcesPromise: Promise<any[]>;
}) {
  // 💥 Wait for the already-resolving promise
  const resources = await resourcesPromise;

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
