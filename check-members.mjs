import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hkvolrsnqttkmysalbha.supabase.co'; 
const SERVICE_ROLE_KEY = 'sb_secret_Fb-_1x3VN-B9UFrPGaLMGw_vC-gHL_K';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkMembers() {
    const projectId = '16efe8d7-5045-42c6-8a21-819ddd2a17ea';
    console.log('--- PROJECT MEMBERS for', projectId, '---');
    const { data: members, error } = await supabase
        .from('project_members')
        .select('*, users(name, email)')
        .eq('project_id', projectId);
    
    if (error) {
        console.error('Error fetching members:', error);
    } else {
        console.table(members.map(m => ({
            user_id: m.user_id,
            name: m.users?.name,
            email: m.users?.email
        })));
    }
}

checkMembers();
