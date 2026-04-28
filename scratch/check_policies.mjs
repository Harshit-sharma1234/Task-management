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

async function checkPolicies() {
  const { data, error } = await supabase.rpc('get_policies', { table_name: 'tickets' })
  if (error) {
    // If RPC doesn't exist, try querying pg_policies
    const { data: policies, error: pgError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'tickets')
    
    if (pgError) {
      console.error('Error fetching policies:', pgError)
    } else {
      console.log('Policies for tickets:', JSON.stringify(policies, null, 2))
    }
  } else {
    console.log('Policies for tickets:', JSON.stringify(data, null, 2))
  }
}

checkPolicies()
