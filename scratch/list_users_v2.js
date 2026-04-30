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
        console.log(`[${user.email}] (length: ${user.email.length}) - ${user.id}`);
    });
    
    const searchEmail = 'harshit.sharma@tectome.co.uk';
    console.log(`\nSearching specifically for: [${searchEmail}]`);
    const match = data.find(u => u.email.toLowerCase().trim() === searchEmail.toLowerCase().trim());
    if (match) {
        console.log(`Found match: [${match.email}] (length: ${match.email.length})`);
        if (match.email !== searchEmail) {
            console.log('NOTICE: They are NOT exactly equal.');
            for (let i = 0; i < Math.max(match.email.length, searchEmail.length); i++) {
                const char1 = match.email[i];
                const char2 = searchEmail[i];
                if (char1 !== char2) {
                    console.log(`Mismatch at index ${i}: Char1=${char1?.charCodeAt(0)}, Char2=${char2?.charCodeAt(0)}`);
                }
            }
        }
    } else {
        console.log('No match found in listed users.');
    }
}

checkUsers();
