import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCachedUserProfile, getCachedUsers } from '@/lib/cache';

// Keep this as a regular async function because this flow depends on
// request-auth context in page/layout. Individual sub-queries are cached.
// NOTE: Do not wrap this in unstable_cache (uses request-bound auth flow).
export async function getProjectDetails(id: string, sessionEmail: string, sessionUserId: string) {
    const adminClient = createAdminClient();

    const [projectRes, cachedUsers, membersRes, profileRes] = await Promise.all([
        adminClient
            .from('projects')
            .select('id, project_name, description, status, priority, lead_id, start_date')
            .eq('id', id)
            .single(),
        getCachedUsers(),
        adminClient.from('project_members').select('user_id').eq('project_id', id),
        // Sidebar permissions: cached profile lookup to avoid repeated DB hits.
        getCachedUserProfile(sessionEmail)
    ]);

    return {
      project: projectRes.data,
      projectError: projectRes.error,
      users: cachedUsers || [],
      members: membersRes.data || [],
      profile: profileRes,
    };
}

// Cache tickets list used by the "tab=issues" view.
// Realtime in the client keeps it globally up-to-date.
export const getProjectIssuesTickets = unstable_cache(
  async (projectId: string) => {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from('tickets')
      .select('id, title, status, priority, assignee_id, reviewer_id, created_at, projects(id, project_name)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    return data || [];
  },
  ['project-issues-tickets'],
  {
    tags: ['issues', 'projects'],
    revalidate: 30,
  }
);

// Cache resources used by the overview view.
// Realtime in `ProjectOverview` keeps it globally up-to-date.
export const getProjectResources = unstable_cache(
  async (projectId: string) => {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from('project_resources')
      .select('id, title, url')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    return data || [];
  },
  ['project-resources'],
  {
    tags: ['project-resources', 'projects'],
    revalidate: 30,
  }
);

export const getProjectMetadata = unstable_cache(
  async (id: string) => {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from('projects')
      .select('project_name, description')
      .eq('id', id)
      .single();

    return data;
  },
  ['project-metadata'],
  {
    tags: ['projects'],
    revalidate: false,
  }
);
