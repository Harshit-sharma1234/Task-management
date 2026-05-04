import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: members, error } = await supabase.from('project_members').select('*')
  console.log('Error?', error)
  console.log('Project Members count:', members?.length)
  if (members && members.length > 0) {
      console.log('Sample members:', members.slice(0, 5))
  }
}
run()
