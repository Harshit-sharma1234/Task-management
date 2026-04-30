const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    const { data, error } = await supabase.from('users').select('id, email, name');
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('--- USERS ---');
    data.forEach(user => {
        console.log(`- ${user.email} (${user.id})`);
    });
}

checkUsers();
