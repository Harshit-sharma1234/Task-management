const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPolicies() {
    const { data, error } = await supabase.rpc('get_policies_for_table', { table_name: 'users' });
    if (error) {
        // If RPC doesn't exist, try querying pg_policies
        const { data: policies, error: pgError } = await supabase.from('pg_policies').select('*').eq('tablename', 'users');
        if (pgError) {
            console.error('Error fetching policies:', pgError);
            // Try raw query if possible, but usually we can't do raw SQL via client
            console.log('Trying to query pg_policies via REST...');
            const { data: restPolicies, error: restError } = await supabase.from('pg_policies').select('*');
            if (restError) console.error('REST Error:', restError);
            else console.log('Policies:', restPolicies);
        } else {
            console.log('Policies:', policies);
        }
    } else {
        console.log('Policies:', data);
    }
}

checkPolicies();
