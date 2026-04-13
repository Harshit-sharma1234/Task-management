'use server'

import { createClient } from '@/lib/supabase/server';
import { getCachedProjects, getCachedUsers } from '@/lib/cache';
import { getUserProfile } from '@/lib/roles';

/**
 * Fetches all essential data for the application in a single parallel pass.
 * This is used to hydrate the global Zustand stores on initial dashboard load.
 */
export async function fetchGlobalSnapshot() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return { error: 'Not authenticated' };

    const [projects, users, profile, unreadRes] = await Promise.all([
        getCachedProjects(),
        getCachedUsers(),
        getUserProfile(supabase, user.email!),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false)
    ]);

    return {
        projects: projects || [],
        team: users || [],
        profile,
        userId: user.id,
        unreadCount: unreadRes.count || 0
    };
}
