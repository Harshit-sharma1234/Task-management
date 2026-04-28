import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testInsert() {
  // Try to find a project and workspace first
  const { data: project } = await supabase.from('projects').select('id, workspace_id').limit(1).single()
  if (!project) {
    console.error('No project found to test with')
    return
  }

  const { data: user } = await supabase.from('users').select('id').limit(1).single()
  if (!user) {
    console.error('No user found to test with')
    return
  }

  console.log(`Testing insert for project ${project.id} in workspace ${project.workspace_id}`)

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      title: 'RLS TEST ' + Date.now(),
      description: 'Test',
      status: 'to_do',
      priority: 'no_priority',
      project_id: project.id,
      workspace_id: project.workspace_id,
      created_by: user.id
    })
    .select('id')
    .single()

  if (error) {
    console.error('INSERT FAILED:', error)
  } else {
    console.log('INSERT SUCCESSFUL:', data)
  }
}

testInsert()
