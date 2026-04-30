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
    revalidateTag('workspaces', "max");
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
    revalidateTag('workspaces', "max");

    return { success: true };
}

import { sendEmail } from '@/lib/email';
import { randomInt } from 'crypto';
import { baseLayout } from '@/lib/email-templates';

/**
 * Sends a custom password reset OTP email via Nodemailer (Gmail).
 */
export async function resetPasswordAction() {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    
    if (!authData?.user?.email) return { error: 'Not authenticated or email missing' };
    const email = authData.user.email;

    const otpCode = randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    const adminClient = createAdminClient();
    
    // Save OTP to your custom email_otps table
    const { error: otpError } = await adminClient
        .from('email_otps')
        .upsert({
            email: email.toLowerCase(),
            otp_code: otpCode,
            expires_at: expiresAt,
            verified: false
        });

    if (otpError) return { error: 'Failed to generate reset code.' };

    // Send via Nodemailer
    const html = baseLayout(`
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a2e;text-align:center;">
          Reset your password
        </h1>
        <p style="margin:0 0 24px;font-size:14px;color:#64748b;text-align:center;line-height:1.6;">
          Use the following verification code to reset your password. This code is valid for 5 minutes.
        </p>
        
        <div style="background-color:#f8f9fc;border-radius:12px;border:1px solid #e8ecf1;padding:24px;text-align:center;margin-bottom:24px;">
          <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#5e6ad2;margin-bottom:8px;">
            ${otpCode}
          </div>
        </div>
    `);
;

    // Non-blocking email send
    (async () => {
        try {
            await sendEmail({
                to: email,
                subject: `Your Tectome security code: ${otpCode}`,
                html
            });
        } catch (err) {
            console.error('[resetPasswordAction] Background email error:', err);
        }
    })();

    return { success: true };
}
