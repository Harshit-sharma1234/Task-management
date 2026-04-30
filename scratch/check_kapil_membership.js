const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMembership() {
    const email = 'kapilnainanidev1@gmail.com';
    const { data: user } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
    
    if (!user) {
        console.log('User not found');
        return;
    }

    const { data: memberships, error } = await supabase
        .from('workspace_members')
        .select('workspace_id, roles(role_name)')
        .eq('user_id', user.id);
    
    if (error) console.error(error);
    else {
        console.log(`Memberships for ${email}:`);
        memberships.forEach(m => {
            const roleName = m.roles ? (Array.isArray(m.roles) ? m.roles[0].role_name : m.roles.role_name) : 'Unknown';
            console.log(`- Workspace ${m.workspace_id}: Role ${roleName}`);
        });
    }
}

checkMembership();
