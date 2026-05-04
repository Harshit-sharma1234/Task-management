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
  // Resolve auth + route params in parallel (getServerUser is React.cache-deduplicated with layout)
  const [user, resolvedParams, resolvedSearchParams] = await Promise.all([
    getServerUser(),
    params,
    searchParams
  ]);

  if (!user) {
    redirect('/login');
  }

  const { workspace: workspaceSlug } = resolvedParams;
  const workspace = await getCachedWorkspaceBySlug(workspaceSlug);

  if (!workspace) {
    redirect('/dashboard');
  }

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
  // Fetch profile first — cached at 3600s TTL so almost always a cache hit (~1ms).
  // This unlocks the member lookup to run in parallel with the heavy queries below.
  const profile = await getCachedUserProfile(userEmail);

  // Now fetch everything in a single parallel batch, including member lookup
  const [ticketsRes, cachedProjects, cachedUsers, member] = await Promise.all([
    getCachedIssuesList(workspaceId, INITIAL_ISSUES_LIMIT),
    getCachedIssueProjects(workspaceId),
    getCachedIssueUsers(workspaceId),
    profile?.id ? getCachedWorkspaceMember(workspaceId, profile.id) : Promise.resolve(null)
  ]);

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
