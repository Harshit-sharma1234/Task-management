import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'projects' }).catch(() => ({error: 'No RPC'}))
  if (error) {
    // Fallback: Query pg_attribute using Postgres query (if we had postgres connection string, but we don't)
    // We can try to just insert an invalid uuid and read the error message
    const { error: insErr } = await supabase.from('projects').insert({ project_name: 'test', assigned_to: 'not-a-uuid' })
    console.log('Error hint:', insErr)
  } else {
    console.log(data)
  }
}
run()
