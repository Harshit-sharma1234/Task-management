'use server';

import { createClient } from '@/lib/supabase/server';
import { getCachedUsers, getCachedUserProfile } from '@/lib/cache';

export async function fetchTeamData() {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData?.user?.email) {
        throw new Error('Not authenticated');
    }

    const [currentUserProfile, users] = await Promise.all([
        getCachedUserProfile(authData.user.email),
        getCachedUsers()
    ]);

    const isAdmin = currentUserProfile?.roles?.role_name === 'Admin';
    
    return {
        users,
        isAdmin
    };
}
