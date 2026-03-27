import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://hkvolrsnqttkmysalbha.supabase.co',
    'sb_publishable_sC5sGo632lHs-6SLEL1cEg_apA3AJCp'
)

async function debug() {
    const email = 'harshit.sharma@tectome.co.uk'
    console.log('--- Querying by email:', email)
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()
    
    if (error) {
        console.error('Error:', error)
        return
    }
    
    console.log('User Row in public.users:')
    console.log(JSON.stringify(data, null, 2))
}

debug()
