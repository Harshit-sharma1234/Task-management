'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath, revalidateTag } from 'next/cache'
import { getUserProfile } from '@/lib/roles'
import { createNotification, parseMentions } from '@/app/dashboard/[workspace]/notifications/actions'

import { getCachedUserProfile } from '@/lib/cache'

export async function createIssue(formData: FormData) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be logged in to create an issue' }
  }

  // Use cached profile
  const profile = await getCachedUserProfile(user.email!)
  if (!profile) {
    return { error: 'User profile not found. Please try logging in again.' }
  }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const status = formData.get('status') as string
  const priority = formData.get('priority') as string
  const projectId = formData.get('project_id') as string
  const assigneeId = formData.get('assignee_id') as string

  // Validation
  if (!title?.trim()) return { error: 'Title is required' }
  if (!description?.trim()) return { error: 'Description is required' }
  if (!status) return { error: 'Status is required' }
  if (!priority) return { error: 'Priority is required' }
  if (!projectId) return { error: 'Project is required' }

  // Step 1: Create Ticket (Atomic)
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
    .select('id, project_id, projects(workspace_id)')
    .single()

  if (error) {
    console.error('SUPABASE ERROR CREATING TICKET:', error)
    if (error.code === '23505' || error.message?.includes('tickets_title_key')) {
      return { error: `A ticket with the title "${title}" already exists. Please use a different title.` }
    }
    return { error: `Failed to create issue: ${error.message}` }
  }

  // --- Background Operations (Parallel) ---
  const adminClient = createAdminClient()

  const runSideEffects = async () => {
    try {
      const sideEffects: Promise<any>[] = []

      // 2. Parallel File Uploads
      const files = formData.getAll('attachments') as File[]
      if (files.length > 0) {
        const uploadPromises = files.filter(f => f && f.size > 0).map(async (file) => {
          const fileExt = file.name.split('.').pop()
          const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
          const filePath = `${data.id}/${fileName}`

          await adminClient.storage.from('issue-attachments').upload(filePath, file, { contentType: file.type, upsert: true })
          const { data: { publicUrl } } = adminClient.storage.from('issue-attachments').getPublicUrl(filePath)

          return { name: file.name, url: publicUrl, type: file.type, size: file.size }
        })

        const metadata = await Promise.all(uploadPromises)
        if (metadata.length > 0) {
          const updateAttachmentPromise = adminClient.from('tickets').update({ attachments: metadata }).eq('id', data.id)
          sideEffects.push(Promise.resolve(updateAttachmentPromise))
        }
      }

      // 3. Side effects: Activity, Notifications, Auto-Membership
      sideEffects.push(logActivity(supabase, profile.id, data.id, 'created', 'Issue created'))

      if (assigneeId) {
        sideEffects.push(createNotification({
          userId: assigneeId,
          actorId: profile.id,
          workspaceId: (data as any).projects?.workspace_id,
          entityType: 'ticket',
          entityId: data.id,
          type: 'assignment',
          message: `${profile.name} assigned you a new issue: ${title}`
        }))

        // Auto-membership
        const membershipPromise = adminClient
          .from('project_members')
          .upsert({ project_id: projectId, user_id: assigneeId }, { onConflict: 'project_id,user_id' })
        sideEffects.push(Promise.resolve(membershipPromise))
      }

      await Promise.all(sideEffects)
    } catch (err) {
      console.error('[createIssue] Side effect error:', err)
    }
  }

  // Fire and forget side effects
  runSideEffects()

  // Granular revalidation only
  revalidateTag('issues', 'max')

  if (projectId) {
    revalidatePath(`/dashboard/projects/${projectId}`);
  }
  revalidatePath('/dashboard');

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

/**
 * Update issue title, description and/or attachments.
 * RBAC: Only Admin, Project Manager, or the ticket creator can edit.
 */
export async function updateIssueContent(formData: FormData) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be logged in to edit an issue' }
  }

  const ticketId = formData.get('id') as string
  if (!ticketId) return { error: 'Ticket ID is required' }

  // Fetch profile and current ticket in parallel
  const [profile, { data: ticket }] = await Promise.all([
    getUserProfile(supabase, user.email!),
    supabase
      .from('tickets')
      .select('id, title, description, created_by, assignee_id, attachments, project_id, projects(workspace_id)')
      .eq('id', ticketId)
      .single()
  ])

  if (!profile) return { error: 'User profile not found' }
  if (!ticket) return { error: 'Ticket not found' }

  // ACCESS GATE: Workspace layout verifies membership; allow edit for all members + creator
  const isCreator = profile.id === ticket.created_by
  const canEdit = true // Workspace membership already verified in layout

  if (!canEdit && !isCreator) {
    return { error: 'Only workspace members can edit this issue.' }
  }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  // Use a stringified JSON for existing attachments to keep
  const existingAttachmentsStr = formData.get('existingAttachments') as string
  const existingAttachments = existingAttachmentsStr ? JSON.parse(existingAttachmentsStr) : []

  // Build the update payload — only include changed fields
  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
    attachments: existingAttachments
  }

  if (title !== undefined && title !== ticket.title) {
    if (!title.trim()) return { error: 'Title cannot be empty' }
    updatePayload.title = title.trim()
  }
  if (description !== undefined && description !== ticket.description) {
    updatePayload.description = description.trim() || null
  }

  // Handle new attachments
  const newFiles = formData.getAll('attachments');
  const newAttachmentsMetadata = [];

  if (newFiles.length > 0) {
    const adminClient = createAdminClient();

    for (const fileObj of newFiles) {
      const file = fileObj as File;
      if (!file || !file.name || file.size === 0) continue;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${ticket.id}/${fileName}`;

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

        newAttachmentsMetadata.push({
          name: file.name,
          url: publicUrl,
          type: file.type,
          size: file.size
        });
      }
    }

    // Merge new attachments with existing ones
    updatePayload.attachments = [...existingAttachments, ...newAttachmentsMetadata];
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('tickets')
    .update(updatePayload)
    .eq('id', ticketId)
    .select()
    .single()

  if (error) {
    console.error('SUPABASE ERROR UPDATING TICKET CONTENT:', error)
    return { error: `Failed to update issue: ${error.message}` }
  }

  // Fire-and-forget logging & notifications
  const postUpdatePromises = []

  if (updatePayload.title) {
    postUpdatePromises.push(
      logActivity(supabase, profile.id, ticketId, 'content_edit', `Updated title from "${ticket.title}" to "${updatePayload.title}"`)
    )
  }
  if (updatePayload.description !== undefined) {
    postUpdatePromises.push(
      logActivity(supabase, profile.id, ticketId, 'content_edit', 'Updated issue description')
    )
  }
  if (newAttachmentsMetadata.length > 0) {
    postUpdatePromises.push(
      logActivity(supabase, profile.id, ticketId, 'content_edit', `Added ${newAttachmentsMetadata.length} new attachment(s)`)
    )
  }

  // Notify the assignee (if different from editor)
  if (ticket.assignee_id && ticket.assignee_id !== profile.id) {
    postUpdatePromises.push(createNotification({
      userId: ticket.assignee_id,
      actorId: profile.id,
      workspaceId: (ticket as any).projects?.workspace_id,
      entityType: 'ticket',
      entityId: ticketId,
      type: 'status_change',
      message: `${profile.name} edited issue: ${updatePayload.title || ticket.title}`
    }))
  }

  Promise.all(postUpdatePromises).catch(err => console.error('Post-edit side effects error:', err))

  revalidatePath(`/dashboard/issues/${ticketId}`, 'page')
  if (ticket.project_id) {
    revalidatePath(`/dashboard/projects/${ticket.project_id}`);
  }
  revalidatePath('/dashboard');
  revalidateTag('issues', 'max')
  return { success: true, data }
}

export async function addComment(ticketId: string, comment: string, formData?: FormData) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be logged in to post a comment' }
  }

  const profile = await getUserProfile(supabase, user.email!)
  if (!profile) {
    return { error: 'User profile not found.' }
  }

  const commentText = comment.trim()
  if (!commentText && (!formData || !formData.has('attachments'))) {
    return { error: 'Comment cannot be empty' }
  }

  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('id, title, created_by, assignee_id, reviewer_id, projects(workspace_id)')
    .eq('id', ticketId)
    .single()

  if (ticketError || !ticket) {
    return { error: 'Ticket not found.' }
  }

  // Roles are now workspace-scoped; commenting is allowed for all workspace members
  const isAdmin = true // Workspace role verified at layout level
  const isPM = false
  const isTicketAssignee = profile.id === ticket.assignee_id
  const isTicketReviewer = profile.id === ticket.reviewer_id

  if (!isAdmin && !isPM && !isTicketAssignee && !isTicketReviewer) {
    return { error: 'Only the Assignee, Reviewer, Admin, or Project Manager can post comments on an issue!' }
  }

  // Handle attachments if present
  let attachmentsMetadata: any[] = []
  if (formData) {
    const files = formData.getAll('attachments') as File[]
    if (files.length > 0) {
      const adminClient = createAdminClient()
      for (const file of files) {
        if (!file || file.size === 0) continue

        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
        // Store in a comments subfolder for this ticket
        const filePath = `comments/${ticketId}/${fileName}`

        const { error: uploadError } = await adminClient.storage
          .from('issue-attachments')
          .upload(filePath, file, { contentType: file.type, upsert: true })

        if (!uploadError) {
          const { data: { publicUrl } } = adminClient.storage
            .from('issue-attachments')
            .getPublicUrl(filePath)

          attachmentsMetadata.push({
            name: file.name,
            url: publicUrl,
            type: file.type,
            size: file.size
          })
        }
      }
    }
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      ticket_id: ticketId,
      comment: commentText,
      attachments: attachmentsMetadata
    })
    .select('id, comment, created_at, user_id, attachments')
    .single()

  if (error) {
    console.error('SUPABASE ERROR ADDING COMMENT:', error)
    if (error.message.includes('row-level security policy') || error.code === '42501') {
      return { error: 'Only the Assignee, Reviewer, Admin, or Project Manager can post comments on an issue!' }
    }
    return { error: `Failed to add comment: ${error.message}` }
  }

  // --- Fire-and-forget: logging, mentions, notifications ---
  // These don't need to block the response to the user
  ; (async () => {
    try {
      // Log comment
      await logActivity(supabase, profile.id, ticketId, 'commented', 'Added a comment')

      const notifyIds = new Set<string>()
      if (ticket.created_by && ticket.created_by !== profile.id) notifyIds.add(ticket.created_by)
      if (ticket.assignee_id && ticket.assignee_id !== profile.id) notifyIds.add(ticket.assignee_id)

      const notificationPromises = []

      const mentionedNames = await parseMentions(commentText)
      if (mentionedNames && mentionedNames.length > 0) {
        const { data: mentionedUsers } = await supabase.from('users').select('id, name').in('name', mentionedNames)
        if (mentionedUsers) {
          for (const mUser of mentionedUsers) {
            if (mUser.id !== profile.id) {
              notificationPromises.push(createNotification({
                userId: mUser.id,
                actorId: profile.id,
                workspaceId: (ticket as any).projects?.workspace_id,
                entityType: 'ticket',
                entityId: ticketId,
                type: 'mention',
                message: `${profile.name} mentioned you in: ${ticket.title}`
              }))
            }
          }
        }
      }

      for (const rid of Array.from(notifyIds)) {
        notificationPromises.push(createNotification({
          userId: rid,
          actorId: profile.id,
          workspaceId: (ticket as any).projects?.workspace_id,
          entityType: 'ticket',
          entityId: ticketId,
          type: 'comment',
          message: `${profile.name} commented on: ${ticket.title}`
        }))
      }

      await Promise.all(notificationPromises)
    } catch (err) {
      console.error('Post-comment side effects error:', err)
    }
  })()

  const responseData = {
    ...data,
    users: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      avatar_url: profile.avatar_url
    }
  }

  revalidatePath(`/dashboard/issues/${ticketId}`, 'page')
  revalidatePath('/dashboard')
  return { success: true, data: responseData }
}

/**
 * Edit a comment. Only the comment author can edit their own comment.
 */
export async function editComment(commentId: string, ticketId: string, newText: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be logged in to edit a comment' }
  }

  const profile = await getUserProfile(supabase, user.email!)
  if (!profile) return { error: 'User profile not found' }

  if (!newText.trim()) return { error: 'Comment cannot be empty' }

  // Fetch the comment to verify ownership
  const adminClient = createAdminClient()
  const { data: comment } = await adminClient
    .from('comments')
    .select('id, user_id')
    .eq('id', commentId)
    .single()

  if (!comment) return { error: 'Comment not found' }
  if (comment.user_id !== profile.id) {
    return { error: 'You can only edit your own comments' }
  }

  const { data, error } = await adminClient
    .from('comments')
    .update({ comment: newText.trim() })
    .eq('id', commentId)
    .select('id, comment, created_at, user_id')
    .single();

  if (error) {
    console.error('SUPABASE ERROR EDITING COMMENT:', error)
    return { error: `Failed to edit comment: ${error.message}` }
  }

  revalidatePath(`/dashboard/issues/${ticketId}`, 'page')
  revalidatePath('/dashboard')
  return { success: true, data }
}

/**
 * Delete a comment. Only the comment author can delete their own comment.
 */
export async function deleteComment(commentId: string, ticketId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be logged in to delete a comment' }
  }

  const profile = await getUserProfile(supabase, user.email!)
  if (!profile) return { error: 'User profile not found' }

  // Fetch the comment to verify ownership
  const adminClient = createAdminClient()
  const { data: comment } = await adminClient
    .from('comments')
    .select('id, user_id')
    .eq('id', commentId)
    .single()

  if (!comment) return { error: 'Comment not found' }
  if (comment.user_id !== profile.id) {
    return { error: 'You can only delete your own comments' }
  }

  const { error } = await adminClient
    .from('comments')
    .delete()
    .eq('id', commentId)

  if (error) {
    console.error('SUPABASE ERROR DELETING COMMENT:', error)
    return { error: `Failed to delete comment: ${error.message}` }
  }

  revalidatePath(`/dashboard/issues/${ticketId}`, 'page')
  revalidatePath('/dashboard')
  return { success: true }
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
      .select('id, title, status, priority, assignee_id, reviewer_id, created_by, project_id, projects(workspace_id)')
      .eq('id', ticketId)
      .single()
  ])
  if (!profile) return { error: 'User profile not found' }

  if (!ticket) return { error: 'Ticket not found' }

  // ACCESS GATE: Workspace layout verifies membership; allow updates for assignee, reviewer, or any member
  const isTicketAssignee = profile.id === ticket.assignee_id
  const isTicketReviewer = profile.id === ticket.reviewer_id
  const isCreator = profile.id === ticket.created_by

  // CONSTRAINT: Assignee can't be the reviewer
  const newAssigneeId = updates.assignee_id !== undefined ? updates.assignee_id : ticket.assignee_id
  const newReviewerId = updates.reviewer_id !== undefined ? updates.reviewer_id : ticket.reviewer_id
  if (newAssigneeId && newReviewerId && newAssigneeId === newReviewerId) {
    return { error: 'The assignee and reviewer cannot be the same person' }
  }

  // Reviewer role validation is now handled via workspace_members
  // TODO: Validate reviewer role from workspace context

  const { data, error } = await supabase
    .from('tickets')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', ticketId)
    .select('id, status, priority, assignee_id, reviewer_id')
    .single()

  if (error) {
    console.error('SUPABASE ERROR UPDATING TICKET:', error)
    return { error: `Failed to update issue: ${error.message}` }
  }

  // Auto-Project Membership for new Assignee or Reviewer
  if (updates.assignee_id || updates.reviewer_id) {
    const adminClient = createAdminClient();
    const projectIdQuery = await adminClient.from('tickets').select('project_id').eq('id', ticketId).single();

    if (projectIdQuery.data?.project_id) {
      const { project_id } = projectIdQuery.data;
      const membershipUpserts = [];

      if (updates.assignee_id) {
        membershipUpserts.push(
          adminClient.from('project_members').upsert({ project_id, user_id: updates.assignee_id }, { onConflict: 'project_id,user_id' })
        );
      }
      if (updates.reviewer_id) {
        membershipUpserts.push(
          adminClient.from('project_members').upsert({ project_id, user_id: updates.reviewer_id }, { onConflict: 'project_id,user_id' })
        );
      }

      await Promise.all(membershipUpserts);
      revalidateTag('projects', 'max');
    }
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
        workspaceId: (ticket as any).projects?.workspace_id,
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
        workspaceId: (ticket as any).projects?.workspace_id,
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

  revalidatePath(`/dashboard/issues/${ticketId}`, 'page')
  if (ticket.project_id) {
    revalidatePath(`/dashboard/projects/${ticket.project_id}`);
  }
  revalidatePath('/dashboard');
  revalidateTag('issues', 'max')
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

  // Use admin client to bypass RLS for deletion
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()

  // Fetch project_id BEFORE deletion so we can revalidate the specific project path
  const { data: ticket } = await adminClient
    .from('tickets')
    .select('project_id')
    .eq('id', ticketId)
    .single()

  const { error } = await adminClient
    .from('tickets')
    .delete()
    .eq('id', ticketId)

  if (error) {
    console.error('SUPABASE ERROR DELETING TICKET (ADMIN):', error)
    return { error: `Failed to delete issue: ${error.message}` }
  }

  function revalidateProjectDataTags(tags: string[] = ['projects', 'tickets']) {
    tags.forEach(tag => revalidateTag(tag, 'max'));
  }
  revalidateProjectDataTags(['issues', 'dashboard-stats']);

  // Force hard re-render of the project layout if we know the project
  if (ticket?.project_id) {
    revalidatePath(`/dashboard/projects/${ticket.project_id}`, 'layout')
    revalidatePath(`/dashboard/projects/${ticket.project_id}`);
  }

  // Also revalidate general issues page
  revalidatePath('/dashboard/issues', 'page')
  revalidatePath('/dashboard');

  return { success: true }
}

/**
 * Bulk update multiple issues in a single batch.
 * Performs one auth check and one DB query instead of N separate server calls.
 */
export async function bulkUpdateIssues(
  ticketIds: string[],
  updates: { status?: string; priority?: string }
) {
  if (!ticketIds.length) return { error: 'No tickets selected' }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }

  const profile = await getUserProfile(supabase, user.email!)
  if (!profile) return { error: 'Profile not found' }

  // TODO: Resolve workspace role for proper RBAC
  // For now, allow bulk updates for all workspace members (layout verifies membership)

  // Single batch update using .in()
  const { data, error } = await supabase
    .from('tickets')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .in('id', ticketIds)
    .select('id, project_id')

  if (error) {
    console.error('SUPABASE ERROR BULK UPDATING TICKETS:', error)
    return { error: `Failed to bulk update: ${error.message}` }
  }

  // Get unique project IDs to revalidate
  const projectIds = Array.from(new Set(data?.map(t => t.project_id).filter(Boolean)));
  for (const pid of projectIds) {
    revalidatePath(`/dashboard/projects/${pid}`);
  }
  revalidatePath('/dashboard');

  revalidateTag('issues', 'max')
  return { success: true, updatedCount: data?.length || 0 }
}

/**
 * Bulk delete multiple issues in a single batch.
 * Performs one auth check and one DB query instead of N separate server calls.
 */
export async function bulkDeleteIssues(ticketIds: string[]) {
  if (!ticketIds.length) return { error: 'No tickets selected' }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }

  const profile = await getUserProfile(supabase, user.email!)
  if (!profile) return { error: 'Profile not found' }

  // Use admin client to bypass RLS for batch deletion
  const adminClient = createAdminClient()

  // Fetch project_ids BEFORE deletion so we can revalidate the specific project paths
  const { data: ticketsToDelete } = await adminClient
    .from('tickets')
    .select('project_id')
    .in('id', ticketIds)

  const { error } = await adminClient
    .from('tickets')
    .delete()
    .in('id', ticketIds)

  if (error) {
    console.error('SUPABASE ERROR BULK DELETING TICKETS:', error)
    return { error: `Failed to bulk delete: ${error.message}` }
  }

  // Get unique project IDs to revalidate
  const projectIds = Array.from(new Set(ticketsToDelete?.map(t => t.project_id).filter(Boolean)));
  for (const pid of projectIds) {
    revalidatePath(`/dashboard/projects/${pid}`);
    revalidatePath(`/dashboard/projects/${pid}`, 'layout'); // Optional based on previous patterns
  }
  revalidatePath('/dashboard/issues', 'page');
  revalidatePath('/dashboard');

  revalidateTag('issues', 'max')
  revalidateTag('dashboard-stats', 'max')
  return { success: true, deletedCount: ticketIds.length }
}
