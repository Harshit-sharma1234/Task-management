import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCachedUserProfile } from '@/lib/cache';

export const getProjectDetails = cache(async (id: string, sessionEmail: string, sessionUserId: string) => {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const [projectRes, usersRes, membersRes, profileRes] = await Promise.all([
        adminClient
            .from('projects')
            .select('id, project_name, description, status, priority, lead_id, start_date')
            .eq('id', id)
            .single(),
        // Keep the user payload minimal (used for lead/member selectors)
        supabase.from('users').select('id, name, email, avatar_url'),
        adminClient.from('project_members').select('user_id').eq('project_id', id),
        // Sidebar permissions: cached profile lookup to avoid repeated DB hits.
        getCachedUserProfile(sessionEmail)
    ]);

    return {
        project: projectRes.data,
        projectError: projectRes.error,
        users: usersRes.data || [],
        members: membersRes.data || [],
        profile: profileRes,
    };
});
