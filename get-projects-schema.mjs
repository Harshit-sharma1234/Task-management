import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.from('projects').select('*').limit(1)
  console.log('Error?', error)
  console.log('Projects list:', data)
  console.log('Projects columns:', data && data.length > 0 ? Object.keys(data[0]) : 'no data')
}
run()
