'use server'

import { createClient } from '@/lib/supabase/server'
import { getProjectIssuesChunk } from './data'

export async function loadProjectIssuesChunk(projectId: string, offset: number, limit: number, activeFilter: string = 'all') {
  if (!projectId) return { error: 'Project ID is required' }

  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) {
    return { error: 'You must be logged in to view project issues' }
  }

  const data = await getProjectIssuesChunk(projectId, offset, limit, activeFilter)
  return { success: true, data }
}
