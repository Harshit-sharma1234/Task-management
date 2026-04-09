import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCachedProjectUsers, getCachedUserProfile } from '@/lib/cache';

const getCachedProjectShell = (projectId: string) =>
  unstable_cache(
    async () => {
      const adminClient = createAdminClient();
      const { data, error } = await adminClient
        .from('projects')
        .select('id, project_name, description, status, priority, lead_id, start_date')
        .eq('id', projectId)
        .single();

      return { data, error };
    },
    ['project-shell', projectId],
    {
      tags: ['projects', `project:${projectId}`],
      revalidate: 300,
    }
  )();

const getCachedProjectMembers = (projectId: string) =>
  unstable_cache(
    async () => {
      const adminClient = createAdminClient();
      const { data } = await adminClient.from('project_members').select('user_id').eq('project_id', projectId);
      return data || [];
    },
    ['project-members', projectId],
    {
      tags: ['project-members', 'projects', `project:${projectId}`],
      revalidate: 300,
    }
  )();

import { cache } from 'react';

// Keep this as a regular async function because this flow depends on
// request-auth context in page/layout. Individual sub-queries are cached.
// NOTE: Do not wrap this in unstable_cache (uses request-bound auth flow).
export const getProjectDetails = cache(async (id: string, sessionEmail: string) => {
    const [projectRes, cachedUsers, membersRes, profileRes] = await Promise.all([
      getCachedProjectShell(id),
      getCachedProjectUsers(id),
      getCachedProjectMembers(id),
      // Sidebar permissions: cached profile lookup to avoid repeated DB hits.
      getCachedUserProfile(sessionEmail)
    ]);

    return {
      project: projectRes.data,
      projectError: projectRes.error,
      users: cachedUsers || [],
      members: membersRes || [],
      profile: profileRes,
    };
});

// Cache tickets list used by the "tab=issues" view.
// Realtime in the client keeps it globally up-to-date.
export async function getProjectIssuesTickets(projectId: string) {
  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();
      const { data } = await adminClient
        .from('tickets')
        .select('id, title, status, priority, assignee_id, reviewer_id, created_at, projects(id, project_name)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      return data || [];
    },
    ['project-issues-tickets', projectId],
    {
      tags: ['issues', 'projects', `project:${projectId}`],
      revalidate: 30,
    }
  )();
}

// Cache resources used by the overview view.
// Realtime in `ProjectOverview` keeps it globally up-to-date.
export async function getProjectResources(projectId: string) {
  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();
      const { data } = await adminClient
        .from('project_resources')
        .select('id, title, url')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      return data || [];
    },
    ['project-resources', projectId],
    {
      tags: ['project-resources', 'projects', `project:${projectId}`],
      revalidate: 30,
    }
  )();
}

export async function getProjectMetadata(id: string) {
  return unstable_cache(
    async () => {
      const adminClient = createAdminClient();
      const { data } = await adminClient
        .from('projects')
        .select('project_name, description')
        .eq('id', id)
        .single();

      return data;
    },
    ['project-metadata', id],
    {
      tags: ['projects', `project:${id}`],
      revalidate: 3600, // 1 hour safety-net; also invalidated via 'projects' tag on mutation
    }
  )();
}
