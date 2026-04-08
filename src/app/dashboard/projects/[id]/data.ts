import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCachedUserProfile, getCachedUsers } from '@/lib/cache';

export const getProjectDetails = cache(async (id: string, sessionEmail: string, sessionUserId: string) => {
    const supabase = await createClient();
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
});

// Cache tickets list used by the "tab=issues" view.
// Realtime in the client keeps it globally up-to-date.
export const getProjectIssuesTickets = cache(async (projectId: string) => {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from('tickets')
    .select('id, title, status, priority, assignee_id, reviewer_id, created_at, projects(id, project_name)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  return data || [];
});

// Cache resources used by the overview view.
// Realtime in `ProjectOverview` keeps it globally up-to-date.
export const getProjectResources = cache(async (projectId: string) => {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from('project_resources')
    .select('id, title, url')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  return data || [];
});
