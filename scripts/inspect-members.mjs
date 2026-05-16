import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: cols, error } = await supabase.rpc('get_table_columns', { table_name: 'project_members' })
  console.log('Columns:', cols)
  
  const { data: members } = await supabase.from('project_members').select('*').limit(5)
  console.log('Sample members:', members)
}
run()
