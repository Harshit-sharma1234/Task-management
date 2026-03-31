import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
  console.log('--- Checking Projects ---')
  const { data: projects, error: projectsError } = await supabase.from('projects').select('*').limit(5)
  if (projectsError) console.error('Projects Error:', projectsError)
  else console.log('Projects Count:', projects?.length, 'Sample:', projects?.[0])

  console.log('\n--- Checking Users ---')
  const { data: users, error: usersError } = await supabase.from('users').select('*').limit(5)
  if (usersError) console.error('Users Error:', usersError)
  else console.log('Users Count:', users?.length, 'Sample:', users?.[0])

  console.log('\n--- Checking Tickets Table ---')
  const { data: tickets, error: ticketsError } = await supabase.from('tickets').select('*').limit(1)
  if (ticketsError) console.error('Tickets Error:', ticketsError)
  else console.log('Tickets Check Success')
}

debug()
