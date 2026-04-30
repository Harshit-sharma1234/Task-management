const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpecificUser() {
    const email = 'harshit.sharma@tectome.co.uk';
    console.log(`Checking for user with email: ${email}`);
    
    // Check public.users
    const { data: publicUser, error: publicError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email);
    
    if (publicError) console.error('Error fetching from public.users:', publicError);
    else console.log('public.users match:', JSON.stringify(publicUser, null, 2));

    // Check with lowercase
    const { data: publicUserLower, error: publicErrorLower } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase());
    
    if (publicErrorLower) console.error('Error fetching from public.users (lower):', publicErrorLower);
    else console.log('public.users match (lower):', JSON.stringify(publicUserLower, null, 2));

    // List all users to see what's there
    const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('email, id');
    
    if (allUsersError) console.error('Error listing all users:', allUsersError);
    else {
        console.log('All user emails in public.users:');
        allUsers.forEach(u => console.log(`- "${u.email}"`));
    }
}

checkSpecificUser();
