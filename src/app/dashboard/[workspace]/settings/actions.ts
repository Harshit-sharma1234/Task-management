'use server';

import { createClient } from '@/lib/supabase/server';
import { getCachedUserProfile } from '@/lib/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';

export async function fetchSettingsData(workspaceSlug: string) {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
        throw new Error('Not authenticated');
    }
    
    const authUser = authData.user;
    const profile = await getCachedUserProfile(authUser.email!);

    // Fetch workspace details and user role
    const adminClient = createAdminClient();
    
    // 1. Resolve workspace
    const { data: workspace } = await adminClient
        .from('workspaces')
        .select('id, name, slug')
        .eq('slug', workspaceSlug)
        .single();

    if (!workspace) throw new Error('Workspace not found');

    // 2. Get user's role in this workspace
    const { data: membership } = await adminClient
        .from('workspace_members')
        .select('role_id, roles(role_name)')
        .eq('workspace_id', workspace.id)
        .eq('user_id', profile?.id)
        .single();

    const user = {
        id: profile?.id || authUser.id,
        name: profile?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        email: authUser.email || '',
        avatar_url: profile?.avatar_url || null,
        workspacerole: (membership as any)?.roles?.role_name || 'Member',
        hasPassword: authUser.identities?.some(id => id.provider === 'email') || false,
        activeWorkspace: {
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug
        }
    };

    return user;
}

/**
 * Deletes a workspace and all its associated data.
 * Requires Admin privileges.
 */
export async function deleteWorkspaceAction(workspaceId: string) {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData?.user) return { error: 'Not authenticated' };

    const adminClient = createAdminClient();
    
    // 1. Verify Admin status
    const { data: profile } = await adminClient
        .from('users')
        .select('id')
        .eq('auth_id', authData.user.id)
        .single();

    if (!profile) return { error: 'User profile not found' };

    const { data: membership } = await adminClient
        .from('workspace_members')
        .select('roles(role_name)')
        .eq('workspace_id', workspaceId)
        .eq('user_id', profile.id)
        .single();

    if ((membership as any)?.roles?.role_name !== 'Admin') {
        return { error: 'Only workspace admins can delete a workspace' };
    }

    // 2. Perform deletion
    const { error: deleteError } = await adminClient
        .from('workspaces')
        .delete()
        .eq('id', workspaceId);

    if (deleteError) {
        console.error('[deleteWorkspaceAction] DB Error:', deleteError);
        return { error: `Failed to delete workspace: ${deleteError.message}` };
    }

    // 3. Cleanup & Redirect
    revalidateTag('workspaces', "default");
    revalidatePath('/dashboard');
    
    // Check if user has other workspaces to redirect properly
    const { data: otherWorkspaces } = await adminClient
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', profile.id)
        .limit(1);

    if (otherWorkspaces && otherWorkspaces.length > 0) {
        redirect('/workspace'); // Redirect to workspace picker
    } else {
        redirect('/workspace?onboarding=true'); // Or a landing/create page
    }
}

/**
 * Updates the workspace name.
 * Requires Admin privileges.
 */
export async function updateWorkspaceAction(workspaceId: string, newName: string) {
    if (!newName || newName.trim().length < 2) {
        return { error: 'Workspace name must be at least 2 characters long' };
    }

    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData?.user) return { error: 'Not authenticated' };

    const adminClient = createAdminClient();
    
    // 1. Verify Admin status
    const { data: profile } = await adminClient
        .from('users')
        .select('id')
        .eq('auth_id', authData.user.id)
        .single();

    if (!profile) return { error: 'User profile not found' };

    const { data: membership } = await adminClient
        .from('workspace_members')
        .select('roles(role_name)')
        .eq('workspace_id', workspaceId)
        .eq('user_id', profile.id)
        .single();

    if ((membership as any)?.roles?.role_name !== 'Admin') {
        return { error: 'Only workspace admins can rename a workspace' };
    }

    // 2. Perform update
    const { error: updateError } = await adminClient
        .from('workspaces')
        .update({ name: newName.trim() })
        .eq('id', workspaceId);

    if (updateError) {
        console.error('[updateWorkspaceAction] DB Error:', updateError);
        return { error: `Failed to update workspace name: ${updateError.message}` };
    }

    // 3. Revalidate
    revalidatePath('/dashboard/[workspace]', 'layout');
    revalidateTag('workspaces', "default");

    return { success: true };
}

