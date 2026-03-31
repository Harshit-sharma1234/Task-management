import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.from('users').select('id, name, email, avatar_url').limit(5)
  console.log('Error?', error)
  console.log('Users Data:')
  if (data) {
      data.forEach(u => console.log(`- ${u.name} (${u.email}): ${u.avatar_url}`))
  }
}
run()
