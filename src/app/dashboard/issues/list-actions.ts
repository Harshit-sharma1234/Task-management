'use server'

import { createClient } from '@/lib/supabase/server'

export async function loadIssuesChunk(offset: number, limit: number) {
  const safeOffset = Number.isFinite(offset) && offset >= 0 ? Math.floor(offset) : 0
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 200) : 0

  if (safeLimit === 0) {
    return { success: true, data: [] as any[] }
  }

  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) {
    return { error: 'You must be logged in to view issues' }
  }

  const { data, error } = await supabase
    .from('tickets')
    .select('id, title, status, priority, assignee_id, reviewer_id, created_at, projects(id, project_name), assignees:users!assignee_id(id, name, avatar_url)')
    .order('created_at', { ascending: false })
    .range(safeOffset, safeOffset + safeLimit - 1)

  if (error) {
    console.error('SUPABASE ERROR LOADING ISSUES CHUNK:', error)
    return { error: `Failed to load issues: ${error.message}` }
  }

  return { success: true, data: data || [] }
}
