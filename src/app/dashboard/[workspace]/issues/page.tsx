import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { IssuesView } from '@/components/dashboard/issues/IssuesView';
import { IssueListSkeleton } from '@/components/dashboard/issues/IssueListSkeleton';
import { Metadata } from 'next';
import { getCachedIssueProjects, getCachedIssueUsers, getCachedIssuesList, getCachedUserProfile, getCachedWorkspaceBySlug, getCachedWorkspaceMember } from '@/lib/cache';

export const metadata: Metadata = {
  title: 'Issues',
  description: 'View and manage all issues.',
};

const INITIAL_ISSUES_LIMIT = 40;
const TOTAL_ISSUES_LIMIT = 120;

import { getServerUser } from '@/lib/auth-server';

export default async function IssuesPage({
  params,
  searchParams
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await getServerUser();

  if (!user) {
    redirect('/login');
  }

  const { workspace: workspaceSlug } = await params;
  const workspace = await getCachedWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    redirect('/dashboard');
  }

  const resolvedSearchParams = await searchParams;
  const filter = resolvedSearchParams.filter || 'all';

  return (
    <Suspense fallback={<IssueListSkeleton />}>
      <IssueListContent
        filter={filter}
        userEmail={user.email!}
        workspaceId={workspace.id}
        workspaceSlug={workspaceSlug}
      />
    </Suspense>
  );
}

async function IssueListContent({ filter, userEmail, workspaceId, workspaceSlug }: { filter: string; userEmail: string; workspaceId: string; workspaceSlug: string }) {
  // Fetch all required data in parallel including user profile
  const [ticketsRes, cachedProjects, cachedUsers, profile] = await Promise.all([
    getCachedIssuesList(workspaceId, INITIAL_ISSUES_LIMIT),
    getCachedIssueProjects(workspaceId),
    getCachedIssueUsers(workspaceId),
    getCachedUserProfile(userEmail)
  ]);

  const member = profile?.id ? await getCachedWorkspaceMember(workspaceId, profile.id) : null;
  const currentUser = profile ? { ...profile, roles: member?.roles || null } : null;

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
      workspaceId={workspaceId}
      workspaceSlug={workspaceSlug}
      initialLimit={INITIAL_ISSUES_LIMIT}
      totalLimit={TOTAL_ISSUES_LIMIT}
    />
  );
}
