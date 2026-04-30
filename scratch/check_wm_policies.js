const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPolicies() {
    const { data, error } = await supabase.from('pg_policies').select('*').eq('tablename', 'workspace_members');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Policies on workspace_members:', data);
    }
}

checkPolicies();
