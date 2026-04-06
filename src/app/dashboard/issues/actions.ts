'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getUserProfile } from '@/lib/roles'
import { createNotification, parseMentions } from '@/app/dashboard/notifications/actions'

export async function createIssue(formData: FormData) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be logged in to create an issue' }
  }

  // Fetch profile — auth user already available
  const [profile] = await Promise.all([
    getUserProfile(supabase, user.email!)
  ])
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
  if (!description?.trim()) {
    return { error: 'Description is required' }
  }
  if (!status) {
    return { error: 'Status is required' }
  }
  if (!priority) {
    return { error: 'Priority is required' }
  }
  if (!projectId) {
    return { error: 'Project is required' }
  }
  if (!assigneeId) {
    return { error: 'Assignee is required' }
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

  // Handle attachments
  const allEntries = Array.from(formData.entries());
  console.log('DEBUG: FormData keys:', allEntries.map(e => e[0]));
  
  const files = formData.getAll('attachments');
  const attachmentsMetadata = [];

  console.log(`DEBUG: Processing ${files.length} potential attachments`);

  if (files.length > 0) {
    const adminClient = createAdminClient();
    
    // Ensure bucket exists (optional but helpful for first-time use)
    try {
      const { data: buckets } = await adminClient.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === 'issue-attachments');
      if (!bucketExists) {
        console.log('DEBUG: Creating missing bucket: issue-attachments');
        await adminClient.storage.createBucket('issue-attachments', { public: true });
      }
    } catch (err) {
      console.error('DEBUG: Error checking/creating bucket:', err);
    }

    for (const fileObj of files) {
      const file = fileObj as File;
      if (!file || !file.name || file.size === 0) {
        console.log(`DEBUG: Skipping invalid/empty file object:`, file ? file.name : 'null');
        continue;
      }
      
      console.log(`DEBUG: Uploading file: ${file.name}, size: ${file.size}, type: ${file.type}`);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${data.id}/${fileName}`;
      
      const { error: uploadError } = await adminClient.storage
        .from('issue-attachments')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true
        });
        
      if (!uploadError) {
        const { data: { publicUrl } } = adminClient.storage
          .from('issue-attachments')
          .getPublicUrl(filePath);
          
        console.log(`DEBUG: Successfully uploaded ${file.name} to ${publicUrl}`);
        attachmentsMetadata.push({
          name: file.name,
          url: publicUrl,
          type: file.type,
          size: file.size
        });
      } else {
        console.error('DEBUG: Error uploading file:', uploadError);
      }
    }
    
    // Update ticket with attachments metadata using adminClient to bypass restrictive RLS
    if (attachmentsMetadata.length > 0) {
      console.log(`DEBUG: Updating ticket ${data.id} with metadata:`, attachmentsMetadata);
      const { error: updateError } = await adminClient
        .from('tickets')
        .update({ attachments: attachmentsMetadata })
        .eq('id', data.id);
        
      if (updateError) {
        console.error('DEBUG: Error updating ticket in DB:', updateError);
      } else {
        console.log('DEBUG: Ticket successfully updated with attachments');
      }
    } else {
      console.log('DEBUG: No attachments metadata to update');
    }
  }

  // Log creation
  await logActivity(supabase, profile.id, data.id, 'created', 'Issue created')

  // Notify Assignee
  if (assigneeId) {
    await createNotification({
      userId: assigneeId,
      actorId: profile.id,
      entityType: 'ticket',
      entityId: data.id,
      type: 'assignment',
      message: `${profile.name} assigned you a new issue: ${title}`
    })
  }

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
    if (error.message.includes('row-level security policy') || error.code === '42501') {
      return { error: 'Only the Assignee, Reviewer, Admin, or Project Manager can post comments on an issue!' }
    }
    return { error: `Failed to add comment: ${error.message}` }
  }

  // Log comment
  await logActivity(supabase, profile.id, ticketId, 'commented', 'Added a comment')

  // --- Notification Triggers ---
  // 1. Fetch ticket to get creator and assignee
  const { data: ticket } = await supabase.from('tickets').select('title, created_by, assignee_id').eq('id', ticketId).single()

  if (ticket) {
    // 3. Notify Creator & Assignee (if not the commenter and not already mentioned)
    const notifyIds = new Set<string>()
    if (ticket.created_by && ticket.created_by !== profile.id) notifyIds.add(ticket.created_by)
    if (ticket.assignee_id && ticket.assignee_id !== profile.id) notifyIds.add(ticket.assignee_id)

    const notificationPromises = []
    
    const mentionedNames = await parseMentions(comment)
    // Add mention notification promises
    if (mentionedNames && mentionedNames.length > 0) {
      const { data: mentionedUsers } = await supabase.from('users').select('id, name').in('name', mentionedNames)
      if (mentionedUsers) {
        for (const mUser of mentionedUsers) {
          if (mUser.id !== profile.id) {
            notificationPromises.push(createNotification({
              userId: mUser.id,
              actorId: profile.id,
              entityType: 'ticket',
              entityId: ticketId,
              type: 'mention',
              message: `${profile.name} mentioned you in: ${ticket.title}`
            }))
          }
        }
      }
    }

    // Add stakeholder notification promises
    for (const rid of Array.from(notifyIds)) {
      notificationPromises.push(createNotification({
        userId: rid,
        actorId: profile.id,
        entityType: 'ticket',
        entityId: ticketId,
        type: 'comment',
        message: `${profile.name} commented on: ${ticket.title}`
      }))
    }
    
    // Await all notification inserts concurrently
    await Promise.all(notificationPromises)
  }

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

  // Fetch profile and current ticket state in parallel
  const [profile, { data: ticket }] = await Promise.all([
    getUserProfile(supabase, user.email!),
    supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single()
  ])
  if (!profile) return { error: 'User profile not found' }

  if (!ticket) return { error: 'Ticket not found' }

  const role = profile.roles?.role_name || 'User'

  // ACCESS GATE: Only Admin, PM, Assignee, or Reviewer can update ticket properties
  const isAdmin = role === 'Admin'
  const isPM = role === 'Project Manager'
  const isTicketAssignee = profile.id === ticket.assignee_id
  const isTicketReviewer = profile.id === ticket.reviewer_id

  if (!isAdmin && !isPM && !isTicketAssignee && !isTicketReviewer) {
    return { error: 'Only the Admin, Project Manager, Assignee, or Reviewer can update this issue.' }
  }

  // CONSTRAINT: Only reviewer can change status to "done"
  if (updates.status === 'done' && ticket.status !== 'done') {
    if (profile.id !== ticket.reviewer_id && role !== 'Admin' && role !== 'Project Manager') {
      return { error: 'Only the reviewer, Admin, or Project Manager can mark this ticket as Done' }
    }
  }

  // CONSTRAINT: Assignee cannot set status to "in_review" or "done"
  if (updates.status === 'in_review' || updates.status === 'done') {
    const isAssignee = profile.id === ticket.assignee_id
    const isReviewer = profile.id === ticket.reviewer_id
    if (isAssignee && role !== 'Admin' && role !== 'Project Manager' && !isReviewer) {
      return { error: 'Assignees cannot change the status to In Review or Done' }
    }
  }

  // CONSTRAINT: Assignee can't be the reviewer
  const newAssigneeId = updates.assignee_id !== undefined ? updates.assignee_id : ticket.assignee_id
  const newReviewerId = updates.reviewer_id !== undefined ? updates.reviewer_id : ticket.reviewer_id
  if (newAssigneeId && newReviewerId && newAssigneeId === newReviewerId) {
    return { error: 'The assignee and reviewer cannot be the same person' }
  }

  if (updates.reviewer_id !== undefined && updates.reviewer_id !== ticket.reviewer_id && updates.reviewer_id !== null) {
    const { data: revUser } = await supabase.from('users').select('roles(role_name)').eq('id', updates.reviewer_id).single()
    const revRoles: any = revUser?.roles
    const newReviewerRole = Array.isArray(revRoles) ? revRoles[0]?.role_name : revRoles?.role_name
    
    if (newReviewerRole && !['Admin', 'Project Manager', 'Senior Developer'].includes(newReviewerRole)) {
      return { error: 'Only Admins, Project Managers, or Senior Developers can be assigned as a reviewer.' }
    }
    
    if (role === 'Senior Developer' && profile.id === updates.reviewer_id) {
      return { error: 'Senior Developers cannot self-assign their own ticket for review.' }
    }
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

  // Logging & Notifications — fire-and-forget (non-blocking)
  // These don't need to block the response to the user
  const postUpdatePromises = []

  if (updates.status && updates.status !== ticket.status) {
    postUpdatePromises.push(logActivity(supabase, profile.id, ticketId, 'status_change', `Changed status from ${ticket.status} to ${updates.status}`))

    if (ticket.assignee_id && ticket.assignee_id !== profile.id) {
      postUpdatePromises.push(createNotification({
        userId: ticket.assignee_id,
        actorId: profile.id,
        entityType: 'ticket',
        entityId: ticketId,
        type: 'status_change',
        message: `${profile.name} changed status to ${updates.status} for: ${ticket.title}`
      }))
    }
  }

  if (updates.assignee_id !== undefined && updates.assignee_id !== ticket.assignee_id) {
    postUpdatePromises.push(logActivity(supabase, profile.id, ticketId, 'assignee_change', 'Updated assignee'))

    if (updates.assignee_id) {
      postUpdatePromises.push(createNotification({
        userId: updates.assignee_id,
        actorId: profile.id,
        entityType: 'ticket',
        entityId: ticketId,
        type: 'assignment',
        message: `${profile.name} assigned you to: ${ticket.title}`
      }))
    }
  }

  if (updates.priority && updates.priority !== ticket.priority) {
    postUpdatePromises.push(logActivity(supabase, profile.id, ticketId, 'priority_change', `Updated priority to ${updates.priority}`))
  }

  // Fire all log + notification writes — don't await them
  Promise.all(postUpdatePromises).catch(err => console.error('Post-update side effects error:', err))

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

  // Removed RBAC: Anyone can delete an issue as requested
  // const role = profile.roles?.role_name
  // if (role !== 'Admin' && role !== 'Project Manager') {
  //   return { error: 'Only Admins or Project Managers can delete issues' }
  // }

  // Use admin client to bypass RLS for deletion as requested "anyone able to delete"
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('tickets')
    .delete()
    .eq('id', ticketId)

  if (error) {
    console.error('SUPABASE ERROR DELETING TICKET (ADMIN):', error)
    return { error: `Failed to delete issue: ${error.message}` }
  }

  revalidatePath('/dashboard/issues')
  revalidatePath(`/dashboard/issues/${ticketId}`)
  revalidatePath('/dashboard')
  return { success: true }
}
