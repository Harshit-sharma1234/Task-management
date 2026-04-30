const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAuthUser() {
    const email = 'harshit.sharma@tectome.co.uk';
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
        console.error('Error listing auth users:', error);
        return;
    }
    
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
        console.log('Found in auth.users:', JSON.stringify(user, null, 2));
    } else {
        console.log('NOT found in auth.users');
        console.log('Total auth users:', users.length);
        // List some to see what's there
        users.slice(0, 5).forEach(u => console.log(`- ${u.email}`));
    }
}

checkAuthUser();
