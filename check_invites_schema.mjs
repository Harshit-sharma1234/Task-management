import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.rpc('inspect_table', { table_name: 'workspace_invites' });
  if (error) {
    // RPC might not exist, try common columns query
    const { data: cols, error: colError } = await supabase.from('workspace_invites').select('*').limit(0)
    console.log('Columns:', Object.keys(cols || {}))
  } else {
    console.log(data)
  }
}
// run()
