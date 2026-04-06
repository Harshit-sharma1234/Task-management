'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getUserProfile } from '@/lib/roles'

export interface LogEntry {
  projectId: string;
  userId: string;
  actionType: string;
  description: string;
  oldValue?: any;
  newValue?: any;
}

export async function insertProjectLog(entry: LogEntry) {
  const adminClient = createAdminClient()

  // User profile is guaranteed to exist — callers verify via getUserProfile() before logging
  const { error } = await adminClient
    .from('project_logs')
    .insert({
      project_id: entry.projectId,
      user_id: entry.userId,
      action_type: entry.actionType,
      description: entry.description,
      old_value: entry.oldValue || null,
      new_value: entry.newValue || null
    })

  if (error) {
    console.error('ERROR INSERTING PROJECT LOG:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function getProjectLogs(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    // Proactive sync check even on fetch
    await getUserProfile(supabase, user.email!, user.id)
  }

  const { data, error } = await supabase
    .from('project_logs')
    .select(`
      *,
      users:user_id (
        name,
        email,
        avatar_url
      )
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('ERROR FETCHING PROJECT LOGS:', error)
    return { error: error.message }
  }

  return { data: data || [] }
}
