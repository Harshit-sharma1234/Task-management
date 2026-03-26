import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://hkvolrsnqttkmysalbha.supabase.co',
    'sb_publishable_sC5sGo632lHs-6SLEL1cEg_apA3AJCp'
)

// Test: Query specific email with roles join
const email = 'harshit.sharma@tectome.co.uk'
console.log('--- Querying for:', email, '---')

const { data, error } = await supabase
    .from('users')
    .select('*, roles(role_name)')
    .eq('email', email)
    .single()

console.log('Data:', JSON.stringify(data, null, 2))
console.log('Error:', JSON.stringify(error, null, 2))

// Test without join
console.log('\n--- Without join ---')
const { data: d2, error: e2 } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

console.log('Data:', JSON.stringify(d2, null, 2))
console.log('Error:', JSON.stringify(e2, null, 2))
