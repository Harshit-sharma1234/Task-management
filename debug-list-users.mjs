import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://hkvolrsnqttkmysalbha.supabase.co',
    'sb_publishable_sC5sGo632lHs-6SLEL1cEg_apA3AJCp'
)

async function debug() {
    console.log('--- Listing all users ---')
    const { data, error } = await supabase
        .from('users')
        .select('name, email, id')
        .limit(10)
    
    if (error) {
        console.error('Error:', error)
        return
    }
    
    console.log('Users in public.users table (first 10):')
    console.log(JSON.stringify(data, null, 2))
}

debug()
