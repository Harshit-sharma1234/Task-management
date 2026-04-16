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

    // 🚀 Launch non-auth dependent parallel requests immediately
    const projectsPromise = getCachedProjects();
    const usersPromise = getCachedUsers();
    
    // 🔒 Auth dependent requests (run alongside above)
    const authPromise = supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return { user: null, profile: null, unreadCount: 0 };
        
        const [profile, unreadRes] = await Promise.all([
            getUserProfile(supabase, user.email!),
            supabase.from('notifications').select('id', { count: 'estimated', head: true }).eq('user_id', user.id).eq('is_read', false)
        ]);

        return { user, profile, unreadCount: unreadRes.count || 0 };
    });

    // 💥 Await everything together to eliminate the waterfall!
    const [projects, team, authResult] = await Promise.all([
        projectsPromise,
        usersPromise,
        authPromise
    ]);

    if (!authResult.user) return { error: 'Not authenticated' };

    return {
        projects: projects || [],
        team: team || [],
        profile: authResult.profile,
        userId: authResult.user.id,
        unreadCount: authResult.unreadCount
    };
}
