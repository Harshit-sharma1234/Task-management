const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGlobalRole() {
    const email = 'harshit.sharma@tectome.co.uk';
    const { data: user } = await supabase
        .from('users')
        .select('id, role_id, roles(role_name)')
        .eq('email', email)
        .maybeSingle();
    
    if (!user) {
        console.log('User not found');
        return;
    }

    const roleName = user.roles ? (Array.isArray(user.roles) ? user.roles[0].role_name : user.roles.role_name) : 'None';
    console.log(`Global role for ${email}: ${roleName} (ID: ${user.role_id})`);
}

checkGlobalRole();
