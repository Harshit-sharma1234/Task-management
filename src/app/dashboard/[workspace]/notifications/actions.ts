'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath, revalidateTag } from 'next/cache'

/**
 * Internal helper to create notifications using the Admin Client 
 * (bypasses RLS for insertion).
 */
export async function createNotification(params: {
    userId: string,
    actorId: string,
    workspaceId: string,
    entityType: 'ticket' | 'project',
    entityId: string,
    type: 'assignment' | 'comment' | 'mention' | 'status_change' | 'project_update',
    message: string
}) {
    const adminClient = createAdminClient()
    
    const { error } = await adminClient
        .from('notifications')
        .insert({
            user_id: params.userId,
            actor_id: params.actorId,
            workspace_id: params.workspaceId,
            entity_type: params.entityType,
            entity_id: params.entityId,
            type: params.type,
            message: params.message
        })

    if (error) {
        console.error('[Notification] Error creating notification:', error)
    }
}

/**
 * Mark a specific notification as read.
 */
export async function markAsRead(notificationId: string, isRead: boolean = true) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: isRead })
        .eq('id', notificationId)

    if (error) {
        console.error('[Notification] Error marking as read:', error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/[workspace]/inbox', 'page')
    // Invalidate cached unread count used by the layout/sidebar
    const { data: { user } } = await supabase.auth.getUser()
    if (user) revalidateTag(`notifications-${user.id}`, "max")
    return { success: true }
}

/**
 * Mark all notifications as read for the current user.
 */
export async function markAllAsRead(workspaceId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)

    if (error) {
        console.error('[Notification] Error marking all as read:', error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/[workspace]/inbox', 'page')
    revalidateTag(`notifications-${user.id}`, "max")
    return { success: true }
}

/**
 * Utility to parse mentions (@Name) from a text block.
 */
export async function parseMentions(text: string): Promise<string[]> {
    // Matches @FollowedByMultipleWordNames (simple heuristic: up to 3 words or until next special char)
    // For this implementation, we'll look for @ capitalized words.
    const mentionRegex = /@([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g
    const matches = text.matchAll(mentionRegex)
    const names = Array.from(matches, m => m[1])
    return Array.from(new Set(names)) // Unique names
}

/**
 * Delete all notifications for the current user.
 */
export async function deleteAllNotifications(workspaceId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)

    if (error) {
        console.error('[Notification] Error deleting all:', error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/[workspace]/inbox', 'page')
    revalidateTag(`notifications-${user.id}`, "max")
    return { success: true }
}

/**
 * Delete all read notifications for the current user.
 */
export async function deleteAllReadNotifications(workspaceId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)
        .eq('is_read', true)

    if (error) {
        console.error('[Notification] Error deleting all read:', error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/[workspace]/inbox', 'page')
    revalidateTag(`notifications-${user.id}`, "max")
    return { success: true }
}

/**
 * Delete a specific notification by ID.
 */
export async function deleteNotification(notificationId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

    if (error) {
        console.error('[Notification] Error deleting notification:', error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/[workspace]/inbox', 'page')
    // Invalidate cached unread count — we don't know the user_id here so invalidate via auth
    const { data: { user } } = await supabase.auth.getUser()
    if (user) revalidateTag(`notifications-${user.id}`, "max")
    return { success: true }
}
