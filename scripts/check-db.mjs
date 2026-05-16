import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://hkvolrsnqttkmysalbha.supabase.co',
    'sb_publishable_sC5sGo632lHs-6SLEL1cEg_apA3AJCp'
)

console.log('--- All Users in DB ---')
const { data, error } = await supabase
    .from('users')
    .select('email, role_id, roles(role_name)')

console.log(JSON.stringify(data, null, 2))
