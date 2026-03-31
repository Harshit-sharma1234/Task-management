import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hkvolrsnqttkmysalbha.supabase.co'; 
const SERVICE_ROLE_KEY = 'sb_secret_Fb-_1x3VN-B9UFrPGaLMGw_vC-gHL_K';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkRLS() {
    console.log('--- RLS POLICIES ---');
    const { data, error } = await supabase.rpc('get_policies'); // Custom RPC if exists, or try direct query
    
    // Since I might not have the RPC, I'll try to query pg_policies via a raw query if possible
    // Wait, I can't do raw SQL easily via the client without an RPC.
    
    // I'll try to check if I can insert/delete as the service role (which should always work)
    // and if I can do it as the user (but I don't have user tokens).
    
    console.log('Checking if service role can read project_members...');
    const { data: members, error: membersError } = await supabase.from('project_members').select('*').limit(1);
    console.log('Members read:', !!members, 'Error:', membersError?.message);

    console.log('\nChecking if service role can read users...');
    const { data: users, error: usersError } = await supabase.from('users').select('*').limit(1);
    console.log('Users read:', !!users, 'Error:', usersError?.message);
}

checkRLS();
