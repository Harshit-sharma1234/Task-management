import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hkvolrsnqttkmysalbha.supabase.co'; 
const SERVICE_ROLE_KEY = 'sb_secret_Fb-_1x3VN-B9UFrPGaLMGw_vC-gHL_K';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkUsers() {
    console.log('--- USERS & ROLES ---');
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*, roles(*)');
    
    if (usersError) {
        console.error('Error fetching users:', usersError);
    } else {
        console.table(users.map(u => ({
            id: u.id,
            email: u.email,
            role: u.roles?.role_name || 'No Role'
        })));
    }

    console.log('\n--- ROLES TABLE ---');
    const { data: roles, error: rolesError } = await supabase.from('roles').select('*');
    if (rolesError) {
        console.error('Error fetching roles:', rolesError);
    } else {
        console.table(roles);
    }
}

checkUsers();
