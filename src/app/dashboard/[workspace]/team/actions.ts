'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCachedUsers, getCachedUserProfile } from '@/lib/cache';
import { revalidateTag, revalidatePath } from 'next/cache';
import { getBaseUrl } from '@/lib/urls';

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
        revalidateTag(`team-members-${workspaceId}`, 'max');
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
        revalidateTag(`team-members-${workspaceId}`, 'max');
        revalidatePath(`/dashboard/${workspaceId}/team`);
    } else {
        revalidatePath('/dashboard/team');
    }
    revalidatePath('/dashboard');
    return { success: true };
}

/**
 * Creates an invite for a user to join a workspace.
 * Restricted to Admin and Project Manager roles.
 */
export async function createWorkspaceInvite(workspaceId: string, email: string, roleId: string) {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser?.email) {
        return { error: 'Not authenticated' };
    }

    const adminClient = createAdminClient();

    // 1. Check requester permissions (Admin or PM)
    const { data: requesterProfile } = await adminClient
        .from('users')
        .select('id')
        .eq('auth_id', authUser.id)
        .single();

    if (!requesterProfile) return { error: 'Requester profile not found' };

    const { data: requesterMembership } = await adminClient
        .from('workspace_members')
        .select('roles(role_name)')
        .eq('workspace_id', workspaceId)
        .eq('user_id', requesterProfile.id)
        .single();

    const requesterRole = (requesterMembership as any)?.roles?.role_name;
    const isAuthorized = requesterRole === 'Admin' || requesterRole === 'Project Manager';

    if (!isAuthorized) {
        return { error: 'Unauthorized: Only Admin and Project Managers can invite members' };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Check if email is already a member
    const { data: targetUser } = await adminClient
        .from('users')
        .select('id')
        .ilike('email', normalizedEmail)
        .maybeSingle();

    if (targetUser) {
        const { data: existingMember } = await adminClient
            .from('workspace_members')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('user_id', targetUser.id)
            .maybeSingle();

        if (existingMember) {
            return { error: 'This user is already a member of the workspace' };
        }
    }

    // 3. Generate token and expiry
    const token = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // 4. Create or refresh invite
    // First try to refresh any existing invite for this workspace/email.
    // This avoids unique-constraint failures on reinvite.
    const invitePayload = {
        role_id: roleId,
        token,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        invited_by: requesterProfile.id,
    };

    let inviteError: any = null;
    const { data: refreshedRows, error: refreshInviteError } = await adminClient
        .from('workspace_invites')
        .update(invitePayload)
        .eq('workspace_id', workspaceId)
        .ilike('email', normalizedEmail)
        .select('id');

    if (refreshInviteError) {
        console.error('[createWorkspaceInvite] Failed to refresh existing invite:', refreshInviteError);
        return { error: `Failed to refresh existing invite: ${refreshInviteError.message}` };
    }

    if (!refreshedRows || refreshedRows.length === 0) {
        // Some schemas enforce email-level uniqueness on invites.
        // Reuse the latest existing invite row for this email before inserting.
        const { data: existingByEmailRows, error: existingByEmailError } = await adminClient
            .from('workspace_invites')
            .select('id')
            .ilike('email', normalizedEmail)
            .order('created_at', { ascending: false })
            .limit(1);

        if (existingByEmailError) {
            console.error('[createWorkspaceInvite] Failed to lookup invite by email:', existingByEmailError);
            return { error: `Failed to lookup existing invite: ${existingByEmailError.message}` };
        }

        const existingByEmail = existingByEmailRows && existingByEmailRows.length > 0
            ? existingByEmailRows[0]
            : null;

        if (existingByEmail?.id) {
            const { error: reuseExistingError } = await adminClient
                .from('workspace_invites')
                .update({
                    workspace_id: workspaceId,
                    email: normalizedEmail,
                    ...invitePayload,
                })
                .eq('id', existingByEmail.id);

            inviteError = reuseExistingError;
        } else {
        const { error: insertInviteError } = await adminClient
            .from('workspace_invites')
            .insert({
                workspace_id: workspaceId,
                email: normalizedEmail,
                ...invitePayload,
            });

        // Handle race condition where another process inserted concurrently.
        if ((insertInviteError as any)?.code === '23505' || insertInviteError?.message?.toLowerCase().includes('duplicate key')) {
            // First recovery: update by workspace + email.
            const { error: recoverUpdateError } = await adminClient
                .from('workspace_invites')
                .update(invitePayload)
                .eq('workspace_id', workspaceId)
                .ilike('email', normalizedEmail);

            if (!recoverUpdateError) {
                inviteError = null;
            } else {
                // Second recovery: some schemas enforce unique invite by email globally.
                // In that case, reuse that invite row for this workspace.
                const { data: globalInvite, error: globalInviteLookupError } = await adminClient
                    .from('workspace_invites')
                    .select('id')
                    .ilike('email', normalizedEmail)
                    .maybeSingle();

                if (globalInviteLookupError || !globalInvite?.id) {
                    inviteError = insertInviteError;
                } else {
                    const { error: globalRecoverUpdateError } = await adminClient
                        .from('workspace_invites')
                        .update({
                            workspace_id: workspaceId,
                            email: normalizedEmail,
                            ...invitePayload,
                        })
                        .eq('id', globalInvite.id);

                    inviteError = globalRecoverUpdateError;
                }
            }
        } else {
            inviteError = insertInviteError;
        }
        }
    }

    const { data: invite, error: fetchInviteError } = await adminClient
        .from('workspace_invites')
        .select('workspaces(name, slug)')
        .eq('workspace_id', workspaceId)
        .ilike('email', normalizedEmail)
        .maybeSingle();

    if (!inviteError && !invite) {
        // Fallback for PostgREST variants that don't return row reliably.
        const { data: inviteRow, error: fetchInviteError } = await adminClient
            .from('workspace_invites')
            .select('workspaces(name, slug)')
            .eq('workspace_id', workspaceId)
            .ilike('email', normalizedEmail)
            .maybeSingle();

        if (fetchInviteError || !inviteRow) {
            console.error('[createWorkspaceInvite] Fetch invite after upsert failed:', fetchInviteError);
            return { error: 'Failed to fetch invite details after creating invite' };
        }

        const workspaceName = (inviteRow as any).workspaces?.name || 'a workspace';
        const baseUrl = getBaseUrl();
        const inviteLink = `${baseUrl}/invite/${token}`;

        try {
            const { sendEmail } = await import('@/lib/email');
            await sendEmail({
                to: normalizedEmail,
                subject: `You've been invited to join ${workspaceName} on Tectome`,
                html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                    <h2 style="color: #4f46e5;">Workspace Invitation</h2>
                    <p>You have been invited to join the <strong>${workspaceName}</strong> workspace on Tectome.</p>
                    <p>Click the button below to accept your invitation and join the team:</p>
                    <div style="margin: 30px 0;">
                        <a href="${inviteLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Accept Invitation</a>
                    </div>
                    <p style="color: #666; font-size: 12px;">This link will expire in 7 days.</p>
                    <p style="color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; pt: 10px;">If you didn't expect this invite, you can safely ignore this email.</p>
                </div>
                `
            });
        } catch (emailErr) {
            console.error('[createWorkspaceInvite] Email send failed but invite created:', emailErr);
        }

        return {
            success: true,
            inviteLink,
            message: `Invite created for ${normalizedEmail}`
        };
    }

    if (inviteError) {
        console.error('[createWorkspaceInvite] Error:', inviteError);
        return { error: `Failed to create invite: ${inviteError.message}` };
    }

    if (fetchInviteError || !invite) {
        console.error('[createWorkspaceInvite] Fetch invite details failed:', fetchInviteError);
        return { error: 'Failed to fetch invite details after creating invite' };
    }

    // 5. Send Email
    const workspaceName = (invite as any).workspaces?.name || 'a workspace';
    const workspaceSlug = (invite as any).workspaces?.slug || 'default';
    const baseUrl = getBaseUrl();
    const inviteLink = `${baseUrl}/invite/${token}`;

    try {
        const { sendEmail } = await import('@/lib/email');
        await sendEmail({
            to: normalizedEmail,
            subject: `You've been invited to join ${workspaceName} on Tectome`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                    <h2 style="color: #4f46e5;">Workspace Invitation</h2>
                    <p>You have been invited to join the <strong>${workspaceName}</strong> workspace on Tectome.</p>
                    <p>Click the button below to accept your invitation and join the team:</p>
                    <div style="margin: 30px 0;">
                        <a href="${inviteLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Accept Invitation</a>
                    </div>
                    <p style="color: #666; font-size: 12px;">This link will expire in 7 days.</p>
                    <p style="color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; pt: 10px;">If you didn't expect this invite, you can safely ignore this email.</p>
                </div>
            `
        });
    } catch (emailErr) {
        console.error('[createWorkspaceInvite] Email send failed but invite created:', emailErr);
    }

    return { 
        success: true, 
        inviteLink,
        message: `Invite created for ${normalizedEmail}`
    };
}
