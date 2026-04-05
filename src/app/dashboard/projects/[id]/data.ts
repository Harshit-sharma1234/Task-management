import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserProfile } from '@/lib/roles';

export const getProjectDetails = cache(async (id: string, sessionEmail: string, sessionUserId: string) => {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const [projectRes, usersRes, membersRes, profileRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', id).single(),
        supabase.from('users').select('id, name, email, avatar_url'),
        adminClient.from('project_members').select('user_id').eq('project_id', id),
        getUserProfile(supabase, sessionEmail, sessionUserId)
    ]);

    return {
        project: projectRes.data,
        projectError: projectRes.error,
        users: usersRes.data || [],
        members: membersRes.data || [],
        profile: profileRes,
    };
});
