'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserProfile } from '@/lib/roles'

export async function createIssue(formData: FormData) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be logged in to create an issue' }
  }

  const profile = await getUserProfile(supabase, user.email!)
  if (!profile) {
    return { error: 'User profile not found in database.' }
  }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const status = formData.get('status') as string
  const priority = formData.get('priority') as string
  const projectId = formData.get('project_id') as string
  const assigneeId = formData.get('assignee_id') as string

  if (!title?.trim()) {
    return { error: 'Title is required' }
  }
  if (!projectId) {
    return { error: 'Project is required' }
  }

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      title,
      description: description || null,
      status: status || 'to_do',
      priority: priority || 'no_priority',
      project_id: projectId,
      assignee_id: assigneeId || null,
      created_by: profile.id
    })
    .select()
    .single()

  if (error) {
    console.error('SUPABASE ERROR CREATING TICKET:', error)
    return { error: `Failed to create issue: ${error.message}` }
  }

  // Log creation
  await logActivity(supabase, profile.id, data.id, 'created', 'Issue created')

  revalidatePath('/dashboard/issues')
  return { success: true, data }
}

async function logActivity(supabase: any, userId: string, ticketId: string, actionType: string, message: string) {
  const { error } = await supabase
    .from('logs')
    .insert({
      user_id: userId,
      ticket_id: ticketId,
      action_type: actionType,
      message: message
    })
  if (error) console.error('Error logging activity:', error)
}

export async function addComment(ticketId: string, comment: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be logged in to post a comment' }
  }

  const profile = await getUserProfile(supabase, user.email!)
  if (!profile) {
    return { error: 'User profile not found.' }
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      ticket_id: ticketId,
      user_id: profile.id,
      comment: comment
    })
    .select('*, users(id, name, email)')
    .single()

  if (error) {
    console.error('SUPABASE ERROR ADDING COMMENT:', error)
    return { error: `Failed to add comment: ${error.message}` }
  }

  // Log comment
  await logActivity(supabase, profile.id, ticketId, 'commented', 'Added a comment')

  revalidatePath(`/dashboard/issues/${ticketId}`)
  return { success: true, data }
}

export async function updateIssue(ticketId: string, updates: { 
  status?: string, 
  assignee_id?: string | null,
  priority?: string,
  reviewer_id?: string | null
}) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be logged in to update an issue' }
  }

  const profile = await getUserProfile(supabase, user.email!)
  if (!profile) return { error: 'User profile not found' }

  // Fetch current ticket state for constraints and logging
  const { data: ticket } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', ticketId)
    .single()

  if (!ticket) return { error: 'Ticket not found' }

  // CONSTRAINT: Only reviewer can change status to "done"
  if (updates.status === 'done' && ticket.status !== 'done') {
    if (profile.id !== ticket.reviewer_id) {
      return { error: 'Only the reviewer can mark this ticket as Done' }
    }
  }

  // CONSTRAINT: Assignee can't be the reviewer
  const newAssigneeId = updates.assignee_id !== undefined ? updates.assignee_id : ticket.assignee_id
  const newReviewerId = updates.reviewer_id !== undefined ? updates.reviewer_id : ticket.reviewer_id
  if (newAssigneeId && newReviewerId && newAssigneeId === newReviewerId) {
    return { error: 'The assignee and reviewer cannot be the same person' }
  }

  const { data, error } = await supabase
    .from('tickets')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', ticketId)
    .select()
    .single()

  if (error) {
    console.error('SUPABASE ERROR UPDATING TICKET:', error)
    return { error: `Failed to update issue: ${error.message}` }
  }

  // Logging specific changes
  if (updates.status && updates.status !== ticket.status) {
    await logActivity(supabase, profile.id, ticketId, 'status_change', `Changed status from ${ticket.status} to ${updates.status}`)
  }
  if (updates.assignee_id !== undefined && updates.assignee_id !== ticket.assignee_id) {
    await logActivity(supabase, profile.id, ticketId, 'assignee_change', 'Updated assignee')
  }
  if (updates.priority && updates.priority !== ticket.priority) {
    await logActivity(supabase, profile.id, ticketId, 'priority_change', `Updated priority to ${updates.priority}`)
  }

  revalidatePath(`/dashboard/issues/${ticketId}`)
  revalidatePath('/dashboard/issues')
  return { success: true, data }
}

export async function deleteIssue(ticketId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be logged in to delete an issue' }
  }

  const profile = await getUserProfile(supabase, user.email!)
  if (!profile) return { error: 'User profile not found' }

  // RBAC: Only Admin or Project Manager can delete
  const role = profile.roles?.role_name
  if (role !== 'Admin' && role !== 'Project Manager') {
    return { error: 'Only Admins or Project Managers can delete issues' }
  }

  const { error } = await supabase
    .from('tickets')
    .delete()
    .eq('id', ticketId)

  if (error) {
    console.error('SUPABASE ERROR DELETING TICKET:', error)
    return { error: `Failed to delete issue: ${error.message}` }
  }

  revalidatePath('/dashboard/issues')
  return { success: true }
}
