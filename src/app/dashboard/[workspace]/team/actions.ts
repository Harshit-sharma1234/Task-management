'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCachedUsers, getCachedUserProfile } from '@/lib/cache';
import { revalidateTag, revalidatePath } from 'next/cache';

export async function fetchTeamData(workspaceId: string) {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData?.user?.email) {
        throw new Error('Not authenticated');
    }

    // Get internal user profile first to get the correct user ID for membership check
    const currentUserProfile = await getCachedUserProfile(authData.user.email);
    if (!currentUserProfile) throw new Error('User profile not found');

    const [users, membership] = await Promise.all([
        getCachedUsers(workspaceId),
        supabase
          .from('workspace_members')
          .select('role_id, roles(role_name)')
          .eq('workspace_id', workspaceId)
          .eq('user_id', currentUserProfile.id)
          .single()
    ]);

    const roleName = (membership.data as any)?.roles?.role_name || '';
    const isAdmin = roleName === 'Admin';
    
    return {
        users,
        isAdmin,
        currentUserRole: roleName
    };
}

/**
 * Removes a user from the current workspace (not global delete).
 * Workspace admins only.
 */
export async function deleteMember(targetUserId: string, workspaceId?: string) {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData?.user?.email) {
        return { error: 'Not authenticated' };
    }

    const profile = await getCachedUserProfile(authData.user.email);
    if (!profile) {
        return { error: 'Profile not found' };
    }

    // Prevent self-removal
    if (targetUserId === profile.id) {
        return { error: 'You cannot remove yourself from the workspace' };
    }

    const adminClient = createAdminClient();

    if (workspaceId) {
        // Remove from workspace_members (workspace-scoped)
        const { error: dbError } = await adminClient
            .from('workspace_members')
            .delete()
            .eq('workspace_id', workspaceId)
            .eq('user_id', targetUserId);

        if (dbError) {
            console.error('[deleteMember] DB Error:', dbError);
            return { error: `Failed to remove member: ${dbError.message}` };
        }
    } else {
        // Fallback: delete from users globally (legacy behavior)
        const { error: dbError } = await adminClient
            .from('users')
            .delete()
            .eq('id', targetUserId);

        if (dbError) {
            console.error('[deleteMember] DB Error:', dbError);
            return { error: `Database Error: ${dbError.message}` };
        }

        // Delete from Supabase Auth
        const { error: authError } = await adminClient.auth.admin.deleteUser(targetUserId);
        if (authError && !authError.message?.includes('not found')) {
            console.error('[deleteMember] Auth Error:', authError);
        }
    }

    revalidateTag('team-members', 'max');
    if (workspaceId) {
        revalidatePath(`/dashboard/${workspaceId}/team`);
    } else {
        revalidatePath('/dashboard/team');
    }
    revalidatePath('/dashboard');
    return { success: true };
}

/**
 * Updates a team member's role within a workspace.
 * Updates workspace_members.role_id instead of the global users.role_id.
 */
export async function updateUserRole(targetUserId: string, newRoleName: string, workspaceId?: string) {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData?.user?.email) {
        return { error: 'Not authenticated' };
    }

    const profile = await getCachedUserProfile(authData.user.email);
    if (!profile) {
        return { error: 'Profile not found' };
    }

    const adminClient = createAdminClient();

    // Lookup role ID
    const { data: roleRecord } = await adminClient
        .from('roles')
        .select('id')
        .eq('role_name', newRoleName)
        .single();

    if (!roleRecord) {
        return { error: 'Invalid role name specified' };
    }

    if (workspaceId) {
        // Update workspace_members role (workspace-scoped)
        const { error: dbError } = await adminClient
            .from('workspace_members')
            .update({ role_id: roleRecord.id })
            .eq('workspace_id', workspaceId)
            .eq('user_id', targetUserId);

        if (dbError) {
            console.error('[updateUserRole] DB Error:', dbError);
            return { error: `Database Error: ${dbError.message}` };
        }
    } else {
        // Fallback: update users.role_id (legacy — will be removed after migration)
        const { error: dbError } = await adminClient
            .from('users')
            .update({ role_id: roleRecord.id })
            .eq('id', targetUserId);

        if (dbError) {
            console.error('[updateUserRole] DB Error:', dbError);
            return { error: `Database Error: ${dbError.message}` };
        }
    }

    revalidateTag('team-members', 'max');
    if (workspaceId) {
        revalidatePath(`/dashboard/${workspaceId}/team`);
    } else {
        revalidatePath('/dashboard/team');
    }
    revalidatePath('/dashboard');
    return { success: true };
}
