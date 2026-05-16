import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    'https://hkvolrsnqttkmysalbha.supabase.co',
    'sb_publishable_sC5sGo632lHs-6SLEL1cEg_apA3AJCp'
)

async function testEmail(email) {
    console.log(`\n--- Testing email: "${email}" ---`)
    const { data, error } = await supabase
        .from('users')
        .select('*, roles(role_name)')
        .eq('email', email)
        .single()

    if (error) {
        console.error('Error:', error.message)
    } else {
        console.log(`Success! Role: ${data.roles?.role_name}`)
    }
}



