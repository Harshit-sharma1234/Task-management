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

  // First, ensure the user exists in the public users table to satisfy foreign key constraints
  try {
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(entry.userId)
    if (!userError && userData?.user) {
      const u = userData.user
      // Try to upsert the user profile in the public table
      // Default to Developer role if we are creating a new profile
      const developerRoleId = 'ebd19f94-ad1e-4949-a2c4-36127425a718' 
      
      await adminClient.from('users').upsert({
        id: u.id,
        auth_id: u.id,
        email: u.email,
        name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Unknown',
        avatar_url: u.user_metadata?.avatar_url || null,
        role_id: u.user_metadata?.role_id || developerRoleId, // Favor existing role if any
        employee_id: u.user_metadata?.employee_id || `EMP-${u.id.substring(0, 8).toUpperCase()}`
      }, { onConflict: 'id' })
    }
  } catch (syncError) {
    console.error('FAILED TO SYNC USER BEFORE LOGGING:', syncError)
  }
  
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
