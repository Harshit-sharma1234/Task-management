'use server'

// Action definitions for the dashboard components

import { createClient } from '../../lib/supabase/server'
import { createAdminClient } from '../../lib/supabase/admin'
import { revalidatePath, revalidateTag } from 'next/cache'
import { getUserProfile } from '../../lib/roles'
import { createNotification } from './notifications/actions'
import { insertProjectLog } from './logging/actions'

/**
 * Granular revalidation for project-related data.
 * Corrected to use a single argument as per Next.js API.
 */
function revalidateProjectDataTags(tags: string[] = ['projects', 'tickets']) {
    tags.forEach(tag => revalidateTag(tag, 'max'));
}

import { getCachedUsers, getCachedUserProfile } from '../../lib/cache'

/**
 * Converts raw Postgres/Supabase errors into user-friendly messages.
 */
function friendlyDbError(error: any, context: 'project' | 'issue' | 'generic' = 'generic'): string {
  const msg: string = error?.message || error?.details || JSON.stringify(error) || '';
  const code: string = error?.code || '';

  // Unique constraint violations
  if (code === '23505' || msg.includes('duplicate key') || msg.includes('unique constraint')) {
    if (msg.includes('project_name') || msg.includes('projects_project_name')) {
      return 'A project with this name already exists. Please choose a different name.';
    }
    if (msg.includes('title') || msg.includes('tickets_title')) {
      return 'An issue with this title already exists in this project. Please use a different title.';
    }
    if (context === 'project') return 'A project with this name already exists. Please choose a different name.';
    if (context === 'issue') return 'An issue with this title already exists. Please use a different title.';
    return 'This record already exists. Please check for duplicates and try again.';
  }

  // Foreign key violations (referencing a deleted/non-existent record)
  if (code === '23503' || msg.includes('foreign key')) {
    return 'One of the selected users or references no longer exists. Please refresh and try again.';
  }

  // Not-null violations
  if (code === '23502' || msg.includes('null value')) {
    return 'Some required fields are missing. Please fill in all required information.';
  }

  // Permission / RLS
  if (code === '42501' || msg.includes('permission denied') || msg.includes('row-level security')) {
    return 'You do not have permission to perform this action.';
  }

  // Network / timeout
  if (msg.includes('timeout') || msg.includes('connection')) {
    return 'Connection issue. Please check your network and try again.';
  }

  // Fallback — still better than SQL
  return `Something went wrong. Please try again. (${msg.substring(0, 80)})`;
}

export async function fetchUsersForProject() {
    return await getCachedUsers()
}

export async function createProject(formData: FormData) {
    const supabase = await createClient()
    
    // Auth and Profile checks
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { error: 'You must be logged in to create a project' }

    // Use cached profile to avoid DB hit
    const profile = await getCachedUserProfile(user.email!)
    if (!profile) return { error: 'User profile not found. Please try logging in again.' }

    const projectName = formData.get('project_name') as string
    const description = formData.get('description') as string
    const leadId = formData.get('lead_id') as string
    const priority = formData.get('priority') as string
    const status = formData.get('status') as string
    const startDate = formData.get('start_date') as string
    const assignedTo = formData.getAll('assigned_to') as string[]

    // Basic validation
    if (!projectName?.trim()) return { error: 'Project name is required' }
    if (!description?.trim()) return { error: 'Description is required' }
    if (!leadId) return { error: 'Lead is required' }
    if (!priority) return { error: 'Priority is required' }
    if (!status) return { error: 'Status is required' }
    
    // Step 1: Create the Project first (Atomic operation)
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
        })
        .select('id')
        .single()

    if (projectError) {
        console.error('SUPABASE ERROR CREATING PROJECT:', projectError)
        return { error: friendlyDbError(projectError, 'project') }
    }

    // --- Background Operations (Fire and forget where possible) ---
    const adminClient = createAdminClient()
    
    // Background execution of side effects (members, notifications, files)
    // We don't await them all if they aren't critical for the "Success" response
    const runSideEffects = async () => {
        try {
            // 2. Members insertion
            const membersToInsert = [{ project_id: newProject.id, user_id: profile.id }]
            if (leadId && leadId !== profile.id) {
                membersToInsert.push({ project_id: newProject.id, user_id: leadId })
            }
            assignedTo.forEach(id => {
                if (id && id !== '' && !membersToInsert.some(m => m.user_id === id)) {
                    membersToInsert.push({ project_id: newProject.id, user_id: id })
                }
            })
            await adminClient.from('project_members').insert(membersToInsert)

            // 3. Notifications & Files
            const secondaryPromises: Promise<any>[] = []
            
            if (leadId && leadId !== profile.id) {
                secondaryPromises.push(createNotification({
                    userId: leadId,
                    actorId: profile.id,
                    entityType: 'project',
                    entityId: newProject.id,
                    type: 'assignment',
                    message: `${profile.name} assigned you as Lead for project: ${projectName}`
                }))
            }
            
            assignedTo.forEach(id => {
                if (id && id !== profile.id && id !== leadId) {
                    secondaryPromises.push(createNotification({
                        userId: id,
                        actorId: profile.id,
                        entityType: 'project',
                        entityId: newProject.id,
                        type: 'assignment',
                        message: `${profile.name} added you as a member to project: ${projectName}`
                    }))
                }
            })

            const files = formData.getAll('attachments') as File[]
            if (files.length > 0) {
                const uploadPromises = files.filter(f => f && f.size > 0).map(async (file) => {
                    const fileExt = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'bin'
                    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
                    const filePath = `${newProject.id}/${fileName}`
                    await adminClient.storage.from('project-attachments').upload(filePath, file, { contentType: file.type, upsert: true })
                    const { data: { publicUrl } } = adminClient.storage.from('project-attachments').getPublicUrl(filePath)
                    return { project_id: newProject.id, title: file.name, url: publicUrl, created_by: user.id }
                })
                
                const results = await Promise.all(uploadPromises)
                if (results.length > 0) {
                    await adminClient.from('project_resources').insert(results)
                }
            }

            await Promise.all(secondaryPromises)
        } catch (err) {
            console.error('[createProject] Side effect error:', err)
        }
    }

    // Run side effects in background — do not await!
    runSideEffects()

    // Immediate Revalidation
    revalidateTag('projects', 'max')
    
    return { success: true, id: newProject.id }
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

    revalidateProjectDataTags()
    revalidatePath('/dashboard/projects', 'page')
    revalidatePath(`/dashboard/projects/${projectId}`, 'page')
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

    revalidateProjectDataTags()
    revalidatePath('/dashboard/projects', 'page')
    revalidatePath(`/dashboard/projects/${projectId}`, 'page')
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

    revalidateProjectDataTags()
    revalidatePath('/dashboard/projects', 'page')
    revalidatePath(`/dashboard/projects/${projectId}`, 'page')
    return { success: true }
}

export async function updateProjectDueDate(projectId: string, dueDate: string | null) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'You must be logged in to update a project' }
    }

    const adminClient = createAdminClient()
    const [profile, { data: oldProject }] = await Promise.all([
        getUserProfile(supabase, user.email!, user.id),
        adminClient.from('projects').select('target_date').eq('id', projectId).single()
    ])
    if (!profile) return { error: 'User profile not found' };

    const { data, error } = await adminClient
        .from('projects')
        .update({ target_date: dueDate })
        .eq('id', projectId)
        .select()

    if (error) {
        // If target_date column does not exist gracefully exit
        return { error: `Failed to update date: maybe target_date column is missing (${error.message})` }
    }

    if (!data || data.length === 0) {
        return { error: 'Project not found' }
    }

    // Non-blocking log
    const oldDateStr = oldProject?.target_date ? new Date(oldProject.target_date).toLocaleDateString() : 'No date'
    const newDateStr = dueDate ? new Date(dueDate).toLocaleDateString() : 'No date'
    insertProjectLog({
        projectId,
        userId: profile.id,
        actionType: 'target_date_change',
        description: `changed due date from ${oldDateStr} to ${newDateStr}`,
        oldValue: { target_date: oldProject?.target_date },
        newValue: { target_date: dueDate }
    }).catch(() => {})

    revalidateProjectDataTags()
    revalidatePath('/dashboard/projects', 'page')
    revalidatePath(`/dashboard/projects/${projectId}`, 'page')
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

    revalidateProjectDataTags()
    revalidatePath('/dashboard/projects', 'page')
    revalidatePath(`/dashboard/projects/${projectId}`, 'page')
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

    revalidateProjectDataTags()
    revalidatePath('/dashboard/projects', 'page')
    revalidatePath(`/dashboard/projects/${projectId}`, 'page')
    return { success: true }
}

export async function toggleProjectMember(projectId: string, userId: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'You must be logged in' }
    }

    // 1. Get permissions & setup bypass — fetch profile and project in parallel
    const [profile, { data: project, error: projectError }] = await Promise.all([
        getUserProfile(supabase, user.email!, user.id),
        supabase
            .from('projects')
            .select('project_name')
            .eq('id', projectId)
            .single()
    ])
    if (!profile) return { error: 'User profile not found' }
    if (projectError || !project) return { error: 'Project not found' }

    // 1. Setup bypass — any logged in user can manage members as per user request
    const apiClient = createAdminClient()

    console.log(`[toggleProjectMember] User: ${user.id}, Project: ${projectId}, Target: ${userId}`)

    // 3. Perform check using chosen client
    const { data: existing, error: checkError } = await apiClient
        .from('project_members')
        .select('project_id')
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
        // Fetch only the target user's name (project_name is already validated above).
        const { data: targetUser } = await supabase
            .from('users')
            .select('name')
            .eq('id', userId)
            .single()

        await createNotification({
            userId: userId,
            actorId: user.id, // Current authenticated user
            entityType: 'project',
            entityId: projectId,
            type: 'assignment',
            message: `${user.user_metadata?.full_name || 'Someone'} added you to project: ${project?.project_name || 'Project'}`
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

    revalidateProjectDataTags()
    revalidatePath('/dashboard/projects', 'page')
    revalidateProjectDataTags()
    revalidatePath(`/dashboard/projects/${projectId}`, 'page')
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

export async function updateUserEmail(email: string) {
    const supabase = await createClient()
    
    // Ensure the user is logged in
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: 'You must be logged in to update your email.' }
    }

    const adminClient = createAdminClient()
    
    // Check if new email already exists
    const { data: existingUser } = await adminClient
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle()
        
    if (existingUser && existingUser.id !== user.id) {
        return { error: 'An account with this email already exists.' }
    }

    // 1. Update Auth Email (using admin client to auto-confirm)
    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(user.id, {
        email: email,
        email_confirm: true 
    })
    
    if (authUpdateError) {
        console.error('Error updating auth email:', authUpdateError)
        return { error: authUpdateError.message }
    }
    
    // 2. Update Public Users table — search by ID, Auth ID, or Email to be robust
    const { error: dbError } = await adminClient
        .from('users')
        .update({ 
            email: email,
            id: user.id,      // Sync public ID to Auth ID
            auth_id: user.id  // Sync Auth ID column
        })
        .or(`id.eq.${user.id},auth_id.eq.${user.id},email.eq.${user.email}`)
        
    if (dbError) {
        console.error('Error updating public user email:', dbError)
        return { error: 'Failed to update user profile and synchronize IDs.' }
    }

    // Since the email has changed, we might need to invalidate their cache
    revalidatePath('/dashboard/settings', 'page')
    return { success: true }
}


export async function updateUserAvatar(userId: string, avatarUrl: string) {
    const supabase = await createClient()
    
    // Get the email and ID from Auth to verify they match what we are trying to update
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const adminClient = createAdminClient()

    // 1. Try to find the existing row by ID OR Email (using admin client to bypass RLS)
    const { data: existingRows } = await adminClient
        .from('users')
        .select('id, email')
        .or(`id.eq.${userId},email.eq.${user.email}`)

    const targetRow = existingRows?.[0]

    let error;
    if (targetRow) {
        // 2. Perform an UPDATE on the existing row
        const { error: updateError } = await adminClient
            .from('users')
            .update({ 
                avatar_url: avatarUrl,
                id: userId,
                name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
            })
            .eq('email', user.email)
        error = updateError
    } else {
        // 3. Perform an INSERT if absolutely new
        const { error: insertError } = await adminClient
            .from('users')
            .insert({ 
                id: userId, 
                avatar_url: avatarUrl, 
                email: user.email,
                name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                employee_id: `EMP-${Date.now()}`,
                role_id: 'f1e5cb69-a296-43c7-8905-00fc99e1f5aa'
            })
        error = insertError
    }

    if (error) {
        console.error('[Avatar Update] Database error during profile sync:', error)
        return { error: error.message }
    }

    // Invalidate all caches that include avatar data
    revalidateTag(`user-profile-${user.email}`, 'max')
    revalidateTag('team-members', 'max')
    revalidateTag('issues', 'max')
    revalidatePath('/dashboard', 'layout')
    return { success: true, avatarUrl }
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

    // Only invalidate cached team members list; no need to re-fetch on every navigation.
    revalidateTag('team-members', 'max')
    revalidatePath('/dashboard/admin', 'page')
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

    revalidatePath(`/dashboard/projects/${projectId}`, 'page')
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

    revalidateProjectDataTags()
    revalidatePath(`/dashboard/projects/${projectId}`)
    return { success: true }
}

/**
 * Deletes a project and all its associated data (members, resources, tickets, logs).
 * Restricted to Admin and Project Manager roles.
 */
export async function deleteProject(projectId: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'You must be logged in' }
    }

    // 1. Verify caller has permission (Admin or Project Manager)
    const profile = await getUserProfile(supabase, user.email!)
    if (!profile || !['Admin', 'Project Manager'].includes(profile.roles?.role_name || '')) {
        return { error: 'Unauthorized: Only Admins and Project Managers can delete projects' }
    }

    const adminClient = createAdminClient()

    // 2. Perform cleanup of related data
    // Delete tickets associated with the project
    const { error: ticketsError } = await adminClient
        .from('tickets')
        .delete()
        .eq('project_id', projectId)
    
    if (ticketsError) {
        console.error('[deleteProject] Error deleting tickets:', ticketsError)
    }

    // Delete project members
    const { error: membersError } = await adminClient
        .from('project_members')
        .delete()
        .eq('project_id', projectId)

    if (membersError) {
        console.error('[deleteProject] Error deleting members:', membersError)
    }

    // Delete project resources/attachments
    const { error: resourcesError } = await adminClient
        .from('project_resources')
        .delete()
        .eq('project_id', projectId)

    if (resourcesError) {
        console.error('[deleteProject] Error deleting resources:', resourcesError)
    }

    // Delete project logs
    const { error: logsError } = await adminClient
        .from('project_logs')
        .delete()
        .eq('project_id', projectId)
    
    if (logsError) {
        console.error('[deleteProject] Error deleting logs:', logsError)
    }

    // 3. Finally delete the project itself
    const { error: projectError } = await adminClient
        .from('projects')
        .delete()
        .eq('id', projectId)

    if (projectError) {
        console.error('[deleteProject] Error deleting project:', projectError)
        return { error: `Failed to delete project: ${projectError.message}` }
    }

    // Handle cascading revalidation
    revalidateProjectDataTags()
    revalidatePath('/dashboard/projects', 'page')
    revalidatePath('/dashboard', 'page')

    return { success: true }
}
