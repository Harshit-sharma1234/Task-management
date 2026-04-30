'use server';
// Rebuild trigger: 1


import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCachedUsers, getCachedUserProfile } from '@/lib/cache';
import { revalidateTag, revalidatePath } from 'next/cache';
import { getBaseUrl } from '@/lib/urls';
import { validateEmail } from '@/lib/validation';
import crypto from 'crypto';


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
          .maybeSingle()
    ]);

    if (!membership.data) {
        return {
            users: [],
            isAdmin: false,
            currentUserRole: 'None'
        };
    }

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
        // 1. Verify caller has permission (Admin or PM)
        const { data: callerMembership } = await adminClient
            .from('workspace_members')
            .select('roles(role_name)')
            .eq('workspace_id', workspaceId)
            .eq('user_id', profile.id)
            .single();

        const rawCallerRole = (callerMembership as any)?.roles;
        const callerRole = Array.isArray(rawCallerRole) 
            ? rawCallerRole[0]?.role_name 
            : rawCallerRole?.role_name;

        if (callerRole !== 'Admin' && callerRole !== 'Project Manager') {
            return { error: `Unauthorized: Your role is ${callerRole || 'Unknown'}. Only Admins and Project Managers can remove members.` };
        }

        // 1.5 Prevent removing the last Admin
        const { data: targetMember } = await adminClient
            .from('workspace_members')
            .select('roles(role_name)')
            .eq('workspace_id', workspaceId)
            .eq('user_id', targetUserId)
            .single();
            
        const rawTargetRole = (targetMember as any)?.roles;
        const targetRoleName = Array.isArray(rawTargetRole)
            ? rawTargetRole[0]?.role_name
            : rawTargetRole?.role_name;
        
        if (targetRoleName === 'Admin') {
            const { data: admins } = await adminClient
                .from('workspace_members')
                .select('user_id, roles!inner(role_name)')
                .eq('workspace_id', workspaceId)
                .eq('roles.role_name', 'Admin');
                
            if (admins && admins.length <= 1) {
                return { error: 'Cannot remove the last Admin from the workspace.' };
            }
        }

        // 2. Cleanup: Remove from all projects and issues in this workspace
        // We do this using subqueries to ensure all projects in this workspace are covered
        const { data: projectIdsData } = await adminClient
            .from('projects')
            .select('id')
            .eq('workspace_id', workspaceId);

        const projectIds = projectIdsData?.map(p => p.id) || [];

        if (projectIds.length > 0) {
            // Remove from project_members for all projects in this workspace
            await adminClient
                .from('project_members')
                .delete()
                .in('project_id', projectIds)
                .eq('user_id', targetUserId);

            // Clear assignments in all workspace tickets (even those not linked to a project)
            await adminClient
                .from('tickets')
                .update({ assignee_id: null })
                .eq('workspace_id', workspaceId)
                .eq('assignee_id', targetUserId);

            await adminClient
                .from('tickets')
                .update({ reviewer_id: null })
                .eq('workspace_id', workspaceId)
                .eq('reviewer_id', targetUserId);
                
            // Also update tickets specifically within those projects (redundancy for safety)
            await adminClient
                .from('tickets')
                .update({ assignee_id: null })
                .in('project_id', projectIds)
                .eq('assignee_id', targetUserId);
        } else {
            // If no projects, still clear workspace-level tickets
            await adminClient
                .from('tickets')
                .update({ assignee_id: null })
                .eq('workspace_id', workspaceId)
                .eq('assignee_id', targetUserId);

            await adminClient
                .from('tickets')
                .update({ reviewer_id: null })
                .eq('workspace_id', workspaceId)
                .eq('reviewer_id', targetUserId);
        }

        // 3. Remove from workspace_members (workspace-scoped)
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
    revalidateTag('team-members', "max");
    revalidateTag('users', "max");
    if (workspaceId) {
        revalidateTag(`team-members-${workspaceId}`, "max");
        revalidateTag(`workspace-${workspaceId}`, "max");
        // Invalidate all projects in the workspace to refresh their member lists
        revalidateTag('projects', "max");
        revalidatePath(`/dashboard/${workspaceId}`);
        revalidatePath(`/dashboard/${workspaceId}/team`);
        revalidatePath(`/dashboard/${workspaceId}/projects`);
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

    // 1. Permission check: Only Admin or PM can change roles
    const { data: callerMembership } = await adminClient
        .from('workspace_members')
        .select('roles(role_name)')
        .eq('workspace_id', workspaceId)
        .eq('user_id', profile.id)
        .single();

    const rawCallerRole = (callerMembership as any)?.roles;
    const callerRole = Array.isArray(rawCallerRole) 
        ? rawCallerRole[0]?.role_name 
        : rawCallerRole?.role_name;

    if (callerRole !== 'Admin' && callerRole !== 'Project Manager') {
        return { error: `Unauthorized: Your role is ${callerRole || 'Unknown'}. Only Admins and Project Managers can change roles.` };
    }

    // New restriction: Only Admin can promote to Admin
    if (newRoleName === 'Admin' && callerRole !== 'Admin') {
        return { error: 'Unauthorized: Only Admins can promote a user to the Admin role.' };
    }

    // 2. Lookup role ID
    const { data: roleRecord } = await adminClient
        .from('roles')
        .select('id')
        .eq('role_name', newRoleName)
        .single();

    if (!roleRecord) {
        return { error: 'Invalid role name specified' };
    }

    if (workspaceId) {
        // 2.5 Prevent demoting the last Admin
        const { data: currentMember } = await adminClient
            .from('workspace_members')
            .select('roles(role_name)')
            .eq('workspace_id', workspaceId)
            .eq('user_id', targetUserId)
            .single();
            
        const rawCurrentRole = (currentMember as any)?.roles;
        const currentRoleName = Array.isArray(rawCurrentRole)
            ? rawCurrentRole[0]?.role_name
            : rawCurrentRole?.role_name;
        
        if (currentRoleName === 'Admin' && newRoleName !== 'Admin') {
            const { data: admins } = await adminClient
                .from('workspace_members')
                .select('user_id, roles!inner(role_name)')
                .eq('workspace_id', workspaceId)
                .eq('roles.role_name', 'Admin');
                
            if (admins && admins.length <= 1) {
                return { error: 'Cannot change role: A workspace must have at least one Admin.' };
            }
        }

        // Update workspace_members role (workspace-scoped)
        const { data: updatedRows, error: dbError } = await adminClient
            .from('workspace_members')
            .update({ role_id: roleRecord.id })
            .eq('workspace_id', workspaceId)
            .eq('user_id', targetUserId)
            .select();

        const count = updatedRows?.length || 0;

        if (dbError) {
            console.error('[updateUserRole] DB Error (workspace_members):', dbError);
            return { error: `Database Error: ${dbError.message}` };
        }
        
        console.log(`[updateUserRole] Updated workspace_members for user ${targetUserId}: ${count} rows`);

        if (count === 0) {
            console.warn(`[updateUserRole] No rows updated for user ${targetUserId} in workspace ${workspaceId}`);
            // Check if member exists at all
            const { data: exists } = await adminClient
                .from('workspace_members')
                .select('id')
                .eq('workspace_id', workspaceId)
                .eq('user_id', targetUserId)
                .maybeSingle();
            
            if (!exists) {
                return { error: 'Member not found in this workspace' };
            }
        }

        // Also update the global users table for consistency (legacy but still read in some places)
        await adminClient
            .from('users')
            .update({ role_id: roleRecord.id })
            .eq('id', targetUserId);

        // 3. Send Notification to User Inbox
        try {
            // Get workspace name for the notification message
            const { data: workspace } = await adminClient
                .from('workspaces')
                .select('name')
                .eq('id', workspaceId)
                .single();

            if (workspace) {
                await adminClient
                    .from('notifications')
                    .insert({
                        user_id: targetUserId,
                        actor_id: profile.id,
                        entity_type: 'workspace',
                        entity_id: workspaceId,
                        workspace_id: workspaceId,
                        type: 'role_change',
                        message: `${profile.name || 'An admin'} changed your role to ${newRoleName} in workspace: ${workspace.name}`,
                        is_read: false
                    });
            }
        } catch (notifyError) {
            console.error('[updateUserRole] Notification Error:', notifyError);
            // Don't fail the whole action if notification fails
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

    revalidateTag('team-members', "max");
    revalidateTag('users', "max");
    if (workspaceId) {
        revalidateTag(`team-members-${workspaceId}`, "max");
        revalidateTag(`workspace-${workspaceId}`, "max");
        revalidatePath(`/dashboard/${workspaceId}`);
        revalidatePath(`/dashboard/${workspaceId}/team`);
    }
    revalidatePath('/dashboard');
    return { success: true };
}

/**
 * Creates an invite for a user to join a workspace.
 * Restricted to Admin and Project Manager roles.
 */
export async function createWorkspaceInvite(workspaceId: string, email: string, roleName: string) {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser?.email) {
        return { error: 'Not authenticated' };
    }

    const adminClient = createAdminClient();
    const normalizedEmail = email.toLowerCase().trim();

    // Validation
    const emailCheck = validateEmail(normalizedEmail);
    if (!emailCheck.valid) {
        return { error: emailCheck.error || 'Invalid email address' };
    }

    // 0. Lookup role ID
    const { data: roleRecord } = await adminClient
        .from('roles')
        .select('id')
        .eq('role_name', roleName)
        .single();

    if (!roleRecord) {
        return { error: 'Invalid role name specified' };
    }
    const roleId = roleRecord.id;

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

    const rawRequesterRole = (requesterMembership as any)?.roles;
    const requesterRole = Array.isArray(rawRequesterRole) 
        ? rawRequesterRole[0]?.role_name 
        : rawRequesterRole?.role_name;

    const isAuthorized = requesterRole === 'Admin' || requesterRole === 'Project Manager';

    if (!isAuthorized) {
        return { error: `Unauthorized: Your role is ${requesterRole || 'Unknown'}. Only Admin and Project Managers can invite members.` };
    }

    // New restriction: Only Admin can invite someone as Admin
    if (roleName === 'Admin' && requesterRole !== 'Admin') {
        return { error: 'Unauthorized: Only Admins can invite users with the Admin role.' };
    }

    // 2. Check if email is already a member
    const { data: targetUser } = await adminClient
        .from('users')
        .select('id')
        .eq('email', normalizedEmail)
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
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitePayload = {
        workspace_id: workspaceId,
        email: normalizedEmail,
        role_id: roleId,
        token,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        invited_by: requesterProfile.id,
        accepted_at: null
    };

    // 4. Create or refresh the invite atomically so resending to the same
    // email updates the existing row instead of hitting the unique constraint.
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
                .update(invitePayload)
                .eq('id', existingByEmail.id);

            inviteError = reuseExistingError;
        } else {
            const { error: insertInviteError } = await adminClient
                .from('workspace_invites')
                .insert(invitePayload);

            // Handle race condition where another process inserted concurrently.
            if ((insertInviteError as any)?.code === '23505' || insertInviteError?.message?.toLowerCase().includes('duplicate key')) {
                const { error: recoverUpdateError } = await adminClient
                    .from('workspace_invites')
                    .update(invitePayload)
                    .eq('workspace_id', workspaceId)
                    .ilike('email', normalizedEmail);

                if (!recoverUpdateError) {
                    inviteError = null;
                } else {
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
                            .update(invitePayload)
                            .eq('id', globalInvite.id);

                        inviteError = globalRecoverUpdateError;
                    }
                }
            } else {
                inviteError = insertInviteError;
            }
        }
    }

    if (inviteError) {
        console.error('[createWorkspaceInvite] Error:', inviteError);
        return { error: `Failed to create invite: ${inviteError.message}` };
    }

    const { data: invite, error: fetchInviteError } = await adminClient
        .from('workspace_invites')
        .select('workspaces(name, slug)')
        .eq('workspace_id', workspaceId)
        .ilike('email', normalizedEmail)
        .maybeSingle();

    if (fetchInviteError || !invite) {
        console.error('[createWorkspaceInvite] Fetch invite details failed:', fetchInviteError);
        return { error: 'Failed to fetch invite details after creating invite' };
    }

    // 5. Send Email (Non-blocking background task)
    const workspaceName = (invite as any).workspaces?.name || 'a workspace';
    const baseUrl = getBaseUrl();
    const inviteLink = `${baseUrl}/invite/${token}`;
;

    // Fire and forget email to avoid blocking the UI response
    (async () => {
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
            console.error('[createWorkspaceInvite] Background email send failed:', emailErr);
        }
    })();

    return { 
        success: true, 
        inviteLink,
        message: `Invite created for ${normalizedEmail}`
    };
}
