const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://YOUR_URL.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    const { data, error } = await supabase.from('users').select('id, name');
    console.log('--- USERS IN DB ---');
    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
    console.log('Total users:', data?.length || 0);
}

checkUsers();
