import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: projects, error } = await supabase.from('projects').select('project_name, lead_id')
  console.log('Error?', error)
  console.log('Projects:')
  
  const { data: users } = await supabase.from('users').select('id, name, avatar_url')
  
  if (projects) {
      projects.forEach(p => {
          const lead = users?.find(u => u.id === p.lead_id)
          console.log(`- ${p.project_name} -> Lead: ${lead?.name} (Avatar: ${lead?.avatar_url})`)
      })
  }
}
run()
