'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserProfile } from '@/lib/roles'

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
    const startDate = formData.get('start_date') as string
    const assignedTo = formData.get('assigned_to') as string

    if (!projectName?.trim()) {
        return { error: 'Project name is required' }
    }
    if (!leadId) {
        return { error: 'Lead is required' }
    }
    if (!priority) {
        return { error: 'Priority is required' }
    }

    const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
            project_name: projectName,
            description: description || null,
            created_by: profile.id,
            lead_id: leadId,
            priority: priority,
            start_date: startDate || null,
            assigned_to: assignedTo || null
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

    const { error: memberError } = await supabase
        .from('project_members')
        .insert(membersToInsert)

    if (memberError) {
        console.error('SUPABASE ERROR ADDING MEMBERS:', memberError)
        // We don't necessarily fail project creation if member insertion fails, 
        // but it's good practice to at least log it.
    }

    revalidatePath('/dashboard')

    return { success: true }
}

export async function updateProjectPriority(projectId: string, priority: string | null) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'You must be logged in to update a project' }
    }

    const { data, error } = await supabase
        .from('projects')
        .update({ priority })
        .eq('id', projectId)
        .select()

    if (error) {
        console.error('SUPABASE ERROR UPDATING PRIORITY:', error)
        return { error: `Failed to update priority: ${error.message || JSON.stringify(error)}` }
    }

    if (!data || data.length === 0) {
        return { error: 'Failed to update: You do not have permission to update this project (Check Supabase UPDATE RLS Policy).' }
    }

    revalidatePath('/dashboard/projects')
    revalidatePath('/dashboard')
    return { success: true }
}

export async function updateProjectLead(projectId: string, leadId: string | null) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'You must be logged in to update a project' }
    }

    const { data, error } = await supabase
        .from('projects')
        .update({ lead_id: leadId })
        .eq('id', projectId)
        .select()

    if (error) {
        console.error('SUPABASE ERROR UPDATING LEAD:', error)
        return { error: `Failed to update lead: ${error.message || JSON.stringify(error)}` }
    }

    if (!data || data.length === 0) {
        return { error: 'Failed to update: You do not have permission to update this project (Check Supabase UPDATE RLS Policy).' }
    }

    revalidatePath('/dashboard/projects')
    revalidatePath('/dashboard')
    return { success: true }
}

export async function updateProjectTargetDate(projectId: string, startDate: string | null) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'You must be logged in to update a project' }
    }

    const { data, error } = await supabase
        .from('projects')
        .update({ start_date: startDate })
        .eq('id', projectId)
        .select()

    if (error) {
        console.error('SUPABASE ERROR UPDATING START DATE:', error)
        if (error.code === 'PGRST204') {
             return { error: `Database schema mismatch: The "start_date" column does not exist on your projects table.` }
        }
        return { error: `Failed to update start date: ${error.message || JSON.stringify(error)}` }
    }

    if (!data || data.length === 0) {
        return { error: 'Failed to update: You do not have permission to update this project (Check Supabase UPDATE RLS Policy).' }
    }

    revalidatePath('/dashboard/projects')
    revalidatePath('/dashboard')
    return { success: true }
}

export async function toggleProjectMember(projectId: string, userId: string) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'You must be logged in' }
    }

    // Check if user is already a member
    const { data: existing, error: checkError } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .maybeSingle()

    if (checkError) {
        console.error('ERROR CHECKING MEMBERSHIP:', checkError)
        return { error: 'Failed to check membership' }
    }

    if (existing) {
        // Remove member
        const { error: deleteError } = await supabase
            .from('project_members')
            .delete()
            .eq('project_id', projectId)
            .eq('user_id', userId)

        if (deleteError) {
            console.error('ERROR REMOVING MEMBER:', deleteError)
            return { error: 'Failed to remove member' }
        }
    } else {
        // Add member
        const { error: insertError } = await supabase
            .from('project_members')
            .insert({ project_id: projectId, user_id: userId })

        if (insertError) {
            console.error('ERROR ADDING MEMBER:', insertError)
            return { error: 'Failed to add member' }
        }
    }

    revalidatePath(`/dashboard/projects/${projectId}`)
    return { success: true }
}
