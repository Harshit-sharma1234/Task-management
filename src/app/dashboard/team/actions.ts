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
    const currentUserRole = currentUserProfile?.roles?.role_name || null;
    
    return {
        users,
        isAdmin,
        currentUserRole
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

    // 1. Verify caller permissions
    const profile = await getCachedUserProfile(authData.user.email);
    const callerRole = profile?.roles?.role_name;
    
    if (callerRole !== 'Admin' && callerRole !== 'Project Manager') {
        return { error: 'Unauthorized: Only Admins or Project Managers can delete members' };
    }

    // 2. Prevent self-deletion
    if (targetUserId === profile.id) {
        return { error: 'You cannot delete your own account' };
    }

    const adminClient = createAdminClient();

    // 2.5 Verify target user for PMs
    if (callerRole === 'Project Manager') {
        const { data: targetUser } = await adminClient
            .from('users')
            .select('roles(role_name)')
            .eq('id', targetUserId)
            .single();
            
        const targetRole = (targetUser?.roles as any)?.role_name;
        if (targetRole !== 'Senior Developer' && targetRole !== 'Junior Developer') {
            return { error: 'Unauthorized: Project Managers can only remove Junior and Senior Developers' };
        }
    }
    // 3. Delete from public.users
    // Note: Due to the SQL Migration, this will auto-cascade/nullify associated records!
    const { error: dbError } = await adminClient
        .from('users')
        .delete()
        .eq('id', targetUserId);

    if (dbError) {
        console.error('[deleteMember] DB Error:', dbError);
        // This should theoretically not hit code 23503 anymore after SQL migration
        return { error: `Database Error: ${dbError.message}` };
    }

    // 4. Delete from Supabase Auth
    const { error: authError } = await adminClient.auth.admin.deleteUser(targetUserId);

    if (authError && authError.message !== 'User not found' && !authError.message?.includes('not found')) {
        console.error('[deleteMember] Auth Error:', authError);
        return { error: `Auth Error: ${authError.message}` };
    }

    return { success: true };
}

/**
 * Updates a team member's role.
 * Admins can assign any role. PMs can assign Dev roles to non-admins.
 */
export async function updateUserRole(targetUserId: string, newRoleName: string) {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData?.user?.email) {
        return { error: 'Not authenticated' };
    }

    const profile = await getCachedUserProfile(authData.user.email);
    const callerRole = profile?.roles?.role_name;
    
    if (callerRole !== 'Admin' && callerRole !== 'Project Manager') {
        return { error: 'Unauthorized: Insufficient permissions to change roles' };
    }

    const adminClient = createAdminClient();

    // Verify roles and target user for PMs
    if (callerRole === 'Project Manager') {
        const { data: targetUser } = await adminClient
            .from('users')
            .select('roles(role_name)')
            .eq('id', targetUserId)
            .single();
            
        const targetRole = (targetUser?.roles as any)?.role_name;
        
        if (targetRole === 'Admin' || targetRole === 'Project Manager') {
            return { error: 'Unauthorized: PMs cannot change roles of Admins or other PMs' };
        }
            
        if (newRoleName === 'Admin' || newRoleName === 'Project Manager') {
            return { error: 'Unauthorized: PMs cannot assign Admin or PM roles' };
        }
    }

    // Lookup role ID
    const { data: roleRecord } = await adminClient
        .from('roles')
        .select('id')
        .eq('role_name', newRoleName)
        .single();

    if (!roleRecord) {
        return { error: 'Invalid role name specified' };
    }

    const { error: dbError } = await adminClient
        .from('users')
        .update({ role_id: roleRecord.id })
        .eq('id', targetUserId);

    if (dbError) {
        console.error('[updateUserRole] DB Error:', dbError);
        return { error: `Database Error: ${dbError.message}` };
    }

    return { success: true };
}
