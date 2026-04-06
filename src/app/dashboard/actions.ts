'use server'

// Action definitions for the dashboard components

import { createClient } from '../../lib/supabase/server'
import { createAdminClient } from '../../lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getUserProfile } from '../../lib/roles'
import { createNotification } from './notifications/actions'
import { insertProjectLog } from './logging/actions'

export async function createProject(formData: FormData) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'You must be logged in to create a project' }
    }

    const profile = await getUserProfile(supabase, user.email!)
    if (!profile) {
        return { error: 'User profile not found in database.' }
    }

    const projectName = formData.get('project_name') as string
    const description = formData.get('description') as string
    const leadId = formData.get('lead_id') as string
    const priority = formData.get('priority') as string
    const status = formData.get('status') as string
    const startDate = formData.get('start_date') as string
    const assignedTo = formData.getAll('assigned_to') as string[]

    if (!projectName?.trim()) {
        return { error: 'Project name is required' }
    }
    if (!description?.trim()) {
        return { error: 'Description is required' }
    }
    if (!leadId) {
        return { error: 'Lead is required' }
    }
    if (!priority) {
        return { error: 'Priority is required' }
    }
    if (!status) {
        return { error: 'Status is required' }
    }
    if (!startDate) {
        return { error: 'Start date is required' }
    }
    if (!assignedTo || assignedTo.length === 0 || (assignedTo.length === 1 && !assignedTo[0])) {
        return { error: 'At least one assignee is required' }
    }

    const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
            project_name: projectName,
            description: description || null,
            created_by: profile.id,
            lead_id: leadId,
            priority: priority,
            status: status,
            start_date: startDate || null,
            assigned_to: null
        })
        .select('id')
        .single()

    if (projectError) {
        console.error('SUPABASE ERROR CREATING PROJECT:', projectError)
        return { error: `Failed to create project: ${projectError.message || JSON.stringify(projectError)}` }
    }

    // Add members to the project_members table
    const membersToInsert = [{ project_id: newProject.id, user_id: profile.id }]
    
    // If the lead is a different person, add them too (if not already added)
    if (leadId && leadId !== profile.id) {
        membersToInsert.push({ project_id: newProject.id, user_id: leadId })
    }

    // Add all selected assignees
    if (assignedTo && assignedTo.length > 0) {
        assignedTo.forEach(id => {
            if (id && !membersToInsert.some(m => m.user_id === id)) {
                membersToInsert.push({ project_id: newProject.id, user_id: id })
            }
        })
    }

    // Use admin client to bypass RLS for member insertion during creation
    const adminClient = createAdminClient()
    const { error: memberError } = await adminClient
        .from('project_members')
        .insert(membersToInsert)

    if (memberError) {
        console.error('SUPABASE ERROR ADDING MEMBERS:', memberError)
    } else {
        // Notify the Lead (if not the creator)
        if (leadId && leadId !== profile.id) {
            await createNotification({
                userId: leadId,
                actorId: profile.id,
                entityType: 'project',
                entityId: newProject.id,
                type: 'assignment',
                message: `${profile.name} assigned you as Lead for project: ${projectName}`
            })
        }

        // Notify other assignees
        if (assignedTo && assignedTo.length > 0) {
            // Need to await all notifications
            await Promise.all(assignedTo.map(async (id) => {
                if (id && id !== profile.id && id !== leadId) {
                    await createNotification({
                        userId: id,
                        actorId: profile.id,
                        entityType: 'project',
                        entityId: newProject.id,
                        type: 'assignment',
                        message: `${profile.name} added you as a member to project: ${projectName}`
                    })
                }
            }))
        }
    }

    revalidatePath('/dashboard', 'layout')

    return { success: true }
}

export async function updateProjectPriority(projectId: string, priority: string | null) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'You must be logged in to update a project' }
    }

    const adminClient = createAdminClient()
    // Fetch profile and old value in parallel
    const [profile, { data: oldProject }] = await Promise.all([
        getUserProfile(supabase, user.email!, user.id),
        adminClient.from('projects').select('priority').eq('id', projectId).single()
    ])
    if (!profile) return { error: 'User profile not found' };

    const { data, error } = await adminClient
        .from('projects')
        .update({ priority })
        .eq('id', projectId)
        .select()

    if (error) {
        return { error: `Failed to update priority: ${error.message}` }
    }

    if (!data || data.length === 0) {
        return { error: 'Project not found' }
    }

    // Insert Log (non-blocking)
    insertProjectLog({
        projectId,
        userId: profile.id,
        actionType: 'priority_change',
        description: `changed priority from ${oldProject?.priority || 'No priority'} to ${priority || 'No priority'}`,
        oldValue: { priority: oldProject?.priority },
        newValue: { priority }
    }).catch(() => {})

    revalidatePath('/dashboard', 'layout')
    return { success: true }
}

export async function updateProjectLead(projectId: string, leadId: string | null) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'You must be logged in to update a project' }
    }

    const adminClient = createAdminClient()
    // Fetch profile and old value in parallel
    const [profile, { data: oldProject }] = await Promise.all([
        getUserProfile(supabase, user.email!, user.id),
        adminClient.from('projects').select('lead_id').eq('id', projectId).single()
    ])
    if (!profile) return { error: 'User profile not found' };

    const { data, error } = await adminClient
        .from('projects')
        .update({ lead_id: leadId })
        .eq('id', projectId)
        .select()

    if (error) {
        return { error: `Failed to update lead: ${error.message}` }
    }

    if (!data || data.length === 0) {
        return { error: 'Project not found' }
    }

    // Fetch user names for description
    const { data: userData } = await adminClient.from('users').select('id, name').in('id', [oldProject?.lead_id, leadId].filter(id => id !== null))
    const userMap = (userData || []).reduce((acc: Record<string, string>, u: { id: string, name: string }) => { 
        acc[u.id] = u.name; 
        return acc; 
    }, {} as Record<string, string>)
    const oldName = oldProject?.lead_id ? userMap[oldProject.lead_id] || 'Unknown' : 'No lead'
    const newName = leadId ? userMap[leadId] || 'Unknown' : 'No lead'

    // Non-blocking log
    insertProjectLog({
        projectId,
        userId: profile.id,
        actionType: 'lead_change',
        description: `changed lead from ${oldName} to ${newName}`,
        oldValue: { lead_id: oldProject?.lead_id },
        newValue: { lead_id: leadId }
    }).catch(() => {})

    revalidatePath('/dashboard', 'layout')
    return { success: true }
}

export async function updateProjectTargetDate(projectId: string, startDate: string | null) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'You must be logged in to update a project' }
    }

    const adminClient = createAdminClient()
    const [profile, { data: oldProject }] = await Promise.all([
        getUserProfile(supabase, user.email!, user.id),
        adminClient.from('projects').select('start_date').eq('id', projectId).single()
    ])
    if (!profile) return { error: 'User profile not found' };

    const { data, error } = await adminClient
        .from('projects')
        .update({ start_date: startDate })
        .eq('id', projectId)
        .select()

    if (error) {
        return { error: `Failed to update date: ${error.message}` }
    }

    if (!data || data.length === 0) {
        return { error: 'Project not found' }
    }

    // Non-blocking log
    const oldDateStr = oldProject?.start_date ? new Date(oldProject.start_date).toLocaleDateString() : 'No date'
    const newDateStr = startDate ? new Date(startDate).toLocaleDateString() : 'No date'
    insertProjectLog({
        projectId,
        userId: profile.id,
        actionType: 'target_date_change',
        description: `changed target date from ${oldDateStr} to ${newDateStr}`,
        oldValue: { start_date: oldProject?.start_date },
        newValue: { start_date: startDate }
    }).catch(() => {})

    revalidatePath('/dashboard', 'layout')
    return { success: true }
}

export async function updateProjectStatus(projectId: string, status: string | null) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'You must be logged in to update a project' }
    }

    const adminClient = createAdminClient()
    const [profile, { data: oldProject }] = await Promise.all([
        getUserProfile(supabase, user.email!, user.id),
        adminClient.from('projects').select('status').eq('id', projectId).single()
    ])
    if (!profile) return { error: 'User profile not found' };

    const { data, error } = await adminClient
        .from('projects')
        .update({ status })
        .eq('id', projectId)
        .select()

    if (error) {
        return { error: `Failed to update status: ${error.message}` }
    }

    if (!data || data.length === 0) {
        return { error: 'Project not found' }
    }

    // Non-blocking log
    insertProjectLog({
        projectId,
        userId: profile.id,
        actionType: 'status_change',
        description: `changed status from ${oldProject?.status || 'No status'} to ${status || 'No status'}`,
        oldValue: { status: oldProject?.status },
        newValue: { status }
    }).catch(() => {})

    revalidatePath('/dashboard', 'layout')
    return { success: true }
}

export async function updateProjectDescription(projectId: string, description: string | null) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'You must be logged in to update a project' }
    }

    const [profile, adminClient] = await Promise.all([
        getUserProfile(supabase, user.email!, user.id),
        Promise.resolve(createAdminClient())
    ])
    if (!profile) return { error: 'User profile not found' };

    const { data, error } = await adminClient
        .from('projects')
        .update({ description })
        .eq('id', projectId)
        .select()

    if (error) {
        return { error: `Failed to update description: ${error.message}` }
    }

    if (!data || data.length === 0) {
        return { error: 'Project not found' }
    }

    // Non-blocking log
    insertProjectLog({
        projectId,
        userId: profile.id,
        actionType: 'description_change',
        description: `updated project description`,
        oldValue: null, 
        newValue: null
    }).catch(() => {})

    revalidatePath('/dashboard', 'layout')
    return { success: true }
}

export async function toggleProjectMember(projectId: string, userId: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'You must be logged in' }
    }

    // 1. Get permissions & setup bypass
    const profile = await getUserProfile(supabase, user.email!, user.id)
    if (!profile) return { error: 'User profile not found' }
    const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('lead_id, created_by')
        .eq('id', projectId)
        .single()

    if (projectError) {
        console.error('ERROR FETCHING PROJECT:', projectError)
        return { error: 'Project not found' }
    }

    const isAdmin = profile?.roles?.role_name === 'Admin'
    const isLead = project?.lead_id === profile?.id || project?.created_by === profile?.id
    // Use admin client to ensure everyone can manage members as per user request
    const apiClient = createAdminClient()

    console.log(`[toggleProjectMember] User: ${user.id}, Project: ${projectId}, Target: ${userId}, Admin: ${isAdmin}, Lead: ${isLead}`)

    // 3. Perform check using chosen client
    const { data: existing, error: checkError } = await apiClient
        .from('project_members')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .maybeSingle()

    if (checkError) {
        console.error('ERROR CHECKING MEMBERSHIP:', checkError)
        return { error: `Failed to check membership: ${checkError.message}` }
    }

    if (existing) {
        // Remove member
        const { error: deleteError } = await apiClient
            .from('project_members')
            .delete()
            .eq('project_id', projectId)
            .eq('user_id', userId)

        if (deleteError) {
            console.error('ERROR REMOVING MEMBER:', deleteError)
            return { error: `Failed to remove member: ${deleteError.message}` }
        }
    } else {
        // Add member
        const { error: insertError } = await apiClient
            .from('project_members')
            .insert({ project_id: projectId, user_id: userId })

        if (insertError) {
            console.error('ERROR ADDING MEMBER:', insertError)
            return { error: `Failed to add member: ${insertError.message}` }
        }

        // --- Notification & Log Trigger ---
        // Fetch project name first
        const { data: project } = await supabase.from('projects').select('project_name').eq('id', projectId).single()
        const { data: targetUser } = await supabase.from('users').select('name').eq('id', userId).single()

        await createNotification({
            userId: userId,
            actorId: user.id, // Current authenticated user
            entityType: 'project',
            entityId: projectId,
            type: 'assignment',
            message: `${user.user_metadata?.full_name || 'Someone'} added you to project: ${project?.project_name || 'New Project'}`
        })

        try {
            await insertProjectLog({
                projectId,
                userId: profile.id, // Use Public User ID
                actionType: 'member_add',
                description: `added member ${targetUser?.name || 'Unknown'}`,
                newValue: { user_id: userId }
            })
        } catch (logError) {
            console.error('FAILED TO INSERT LOG:', logError)
        }
    }

    revalidatePath('/dashboard', 'layout')
    return { success: true }
}

export async function updateUserPassword(password: string) {
    const supabase = await createClient()
    
    // Ensure the user is logged in
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: 'You must be logged in to update your password.' }
    }

    const { error } = await supabase.auth.updateUser({ password })
    
    if (error) {
        console.error('Error updating password:', error)
        return { error: error.message }
    }

    return { success: true }
}

export async function updateUserAvatar(userId: string, avatarUrl: string) {
    const supabase = await createClient()
    
    // Get the email and ID from Auth to verify they match what we are trying to update
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // 1. Try to find the existing row by ID OR Email
    const { data: existingRows } = await supabase
        .from('users')
        .select('id, email')
        .or(`id.eq.${userId},email.eq.${user.email}`)

    const targetRow = existingRows?.[0]

    let error;
    if (targetRow) {
        // 2. Perform an UPDATE on the existing row (using its actual ID)
        const { error: updateError } = await supabase
            .from('users')
            .update({ 
                avatar_url: avatarUrl,
                id: userId, // Fix the ID if it was different
                name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
            })
            .eq('email', user.email)
        error = updateError
    } else {
        // 3. Perform an INSERT if absolutely new
        // Note: This needs a default for employee_id if it's required
        const { error: insertError } = await supabase
            .from('users')
            .insert({ 
                id: userId, 
                avatar_url: avatarUrl, 
                email: user.email,
                name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                employee_id: `EMP-${Date.now()}`, // Temporary fallback for required columns
                role_id: 'f1e5cb69-a296-43c7-8905-00fc99e1f5aa' // Junior Developer
            })
        error = insertError
    }

    if (error) {
        console.error('[Avatar Update] Database error during profile sync:', error)
        return { error: error.message }
    }

    // Invalidate profile caches
    revalidatePath('/dashboard', 'layout')
    return { success: true }
}

export async function provisionEmployee(formData: FormData) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'You must be logged in to provision employees' }
    }

    // 1. Verify caller is Admin
    const adminProfile = await getUserProfile(supabase, user.email!)
    if (adminProfile?.roles?.role_name !== 'Admin') {
        return { error: 'Unauthorized: Only Admins can provision new employees' }
    }

    const email = (formData.get('email') as string).trim().toLowerCase()
    const name = formData.get('name') as string
    const employeeId = formData.get('employee_id') as string
    const roleId = formData.get('role_id') as string
    const tempPassword = (formData.get('password') as string) || 'Welcome123!'

    if (!email || !name || !employeeId || !roleId) {
        return { error: 'All fields are required' }
    }

    const adminClient = createAdminClient()

    // 2. Create Auth User (Silently)
    const { data: authData, error: createAuthError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, 
        user_metadata: { full_name: name }
    })

    if (createAuthError) {
        console.error('[Provision] ERROR CREATING AUTH USER:', createAuthError)
        return { error: `Auth Error: ${createAuthError.message}` }
    }

    const newUserId = authData.user.id

    // 3. Insert into public.users
    const { error: dbError } = await adminClient
        .from('users')
        .insert({
            id: newUserId,
            email,
            name,
            employee_id: employeeId,
            role_id: roleId
        })

    if (dbError) {
        console.error('ERROR CREATING DB PROFILE:', dbError)
        // Cleanup Auth user if DB insert fails to prevent orphaned auth users
        await adminClient.auth.admin.deleteUser(newUserId)
        return { error: `Database Error: ${dbError.message}` }
    }

    revalidatePath('/dashboard', 'layout')
    return { success: true, message: `Account created for ${name}. Temporary password: ${tempPassword}` }
}

export async function addProjectResource(projectId: string, title: string, url: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'You must be logged in' }
    }

    const { data, error } = await supabase
        .from('project_resources')
        .insert({
            project_id: projectId,
            title,
            url,
            created_by: user.id
        })
        .select()
        .single()

    if (error) {
        console.error('SUPABASE ERROR ADDING RESOURCE:', error)
        return { error: `Failed to add resource: ${error.message}` }
    }

    revalidatePath('/dashboard', 'layout')
    return { success: true, data }
}

export async function deleteProjectResource(resourceId: string, projectId: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'You must be logged in' }
    }

    const { error } = await supabase
        .from('project_resources')
        .delete()
        .eq('id', resourceId)

    if (error) {
        console.error('SUPABASE ERROR DELETING RESOURCE:', error)
        return { error: `Failed to delete resource: ${error.message}` }
    }

    revalidatePath(`/dashboard/projects/${projectId}`)
    return { success: true }
}
