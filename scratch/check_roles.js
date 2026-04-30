const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRoles() {
    const { data, error } = await supabase.from('roles').select('*');
    if (error) {
        console.error('Error fetching roles:', error);
        return;
    }
    console.log('--- ROLES ---');
    console.log(JSON.stringify(data, null, 2));
}

checkRoles();
