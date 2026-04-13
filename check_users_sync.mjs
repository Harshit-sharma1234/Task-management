import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function check() {
  const { data: users, error } = await supabase.from('users').select('id, email, auth_id')
  if (error) {
    console.error(error)
    return
  }
  console.log('Public Users Table:')
  console.table(users)

  const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers()
  if (authError) {
    console.error(authError)
    return
  }
  console.log('\nAuth Users:')
  console.table(authUsers.map(u => ({ id: u.id, email: u.email })))
}

check()
