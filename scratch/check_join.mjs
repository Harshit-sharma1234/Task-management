
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkJoin() {
  const { data, error } = await supabase
    .from('projects')
    .select('id, project_name, lead_id, lead:users!lead_id(id, name)')
    .not('lead_id', 'is', null)
    .limit(1)

  if (error) {
    console.error('Join failed:', error)
  } else {
    console.log('Join successful:', data)
  }
}

checkJoin()
