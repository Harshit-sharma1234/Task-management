'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCachedUsers, getCachedUserProfile } from '@/lib/cache';
import { revalidateTag } from 'next/cache';

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

/**
 * Deletes a team member from both the database and Supabase Auth.
 * Restricted to Admin role only.
 */
export async function deleteMember(targetUserId: string) {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData?.user?.email) {
        return { error: 'Not authenticated' };
    }

    // 1. Verify caller is Admin
    const profile = await getCachedUserProfile(authData.user.email);
    if (profile?.roles?.role_name !== 'Admin') {
        return { error: 'Unauthorized: Only Admins can delete members' };
    }

    // 2. Prevent self-deletion
    if (targetUserId === profile.id) {
        return { error: 'You cannot delete your own account' };
    }

    const adminClient = createAdminClient();

    // 3. Delete from public.users (will handle cascading deletes if setup)
    const { error: dbError } = await adminClient
        .from('users')
        .delete()
        .eq('id', targetUserId);

    if (dbError) {
        console.error('[deleteMember] DB Error:', dbError);
        return { error: `Database Error: ${dbError.message}` };
    }

    // 4. Delete from Supabase Auth
    const { error: authError } = await adminClient.auth.admin.deleteUser(targetUserId);

    if (authError) {
        console.error('[deleteMember] Auth Error:', authError);
        return { error: `Auth Error: ${authError.message}` };
    }

    revalidateTag('team-members', 'max');
    return { success: true };
}
