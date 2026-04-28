import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testVisibility() {
  console.log('Testing user visibility with ANON key...')
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email')
    .limit(5)
    
  if (error) {
    console.error('Error fetching users:', error.message)
  } else {
    console.log('Successfully fetched users:', data.length)
    data.forEach(u => console.log(`- ${u.name} (${u.email})`))
    if (data.length > 0) {
        console.log('RESULT: Users are visible.')
    } else {
        console.log('RESULT: No users returned.')
    }
  }
}

testVisibility()
