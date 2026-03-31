import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: projects } = await supabase.from('projects').select('*').eq('project_name', 'makebox')
  console.log('Projects found:', projects)
  
  if (projects && projects.length > 0) {
    const pId = projects[0].id
    const { data: members } = await supabase.from('project_members').select('*, users(name, email)').eq('project_id', pId)
    console.log('Members for makebox:', members)
  }
}
run()
