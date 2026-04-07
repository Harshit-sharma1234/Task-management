'use server';

import { createClient } from '@/lib/supabase/server';
import { getCachedUserProfile } from '@/lib/cache';

export async function fetchSettingsData() {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
        throw new Error('Not authenticated');
    }
    
    const authUser = authData.user;
    const profile = await getCachedUserProfile(authUser.email!);

    const user = {
        id: profile?.id || authUser.id,
        name: profile?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        email: authUser.email || '',
        avatar_url: profile?.avatar_url || null
    };

    return user;
}
