
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for bypass

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, project_name, lead_id')
    .is('lead_id', null)
    .limit(10)

  if (error) {
    console.error('Error fetching projects:', error)
    return
  }

  console.log('Projects with NULL lead_id:', projects)
  
  if (projects && projects.length > 0) {
      // Check if there are ANY users in the workspace of the first project
      const { data: workspace } = await supabase.from('projects').select('workspace_id').eq('id', projects[0].id).single()
      if (workspace) {
          const { data: members } = await supabase.from('workspace_members').select('user_id').eq('workspace_id', workspace.workspace_id)
          console.log(`Members in workspace ${workspace.workspace_id}:`, members)
      }
  }
}

debug()
