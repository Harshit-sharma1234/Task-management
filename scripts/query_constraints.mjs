import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.rpc('inspect_foreign_keys', { table_name: 'workspaces' });
  
  if (error) {
    console.log('RPC failed, trying direct SQL via query_db equivalent...');
    // Since I can't run arbitrary SQL easily without an RPC, I'll check common files instead.
  } else {
    console.log(data)
  }
}
// run()
