import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load credentials from .env.local so secrets are not hardcoded.
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials in env (.env.local):');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkUsers() {
    console.log('--- USERS & ROLES ---');
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*, roles(*)');
    
    if (usersError) {
        console.error('Error fetching users:', usersError);
    } else {
        console.table(users.map(u => ({
            id: u.id,
            email: u.email,
            role: u.roles?.role_name || 'No Role'
        })));
    }

    console.log('\n--- ROLES TABLE ---');
    const { data: roles, error: rolesError } = await supabase.from('roles').select('*');
    if (rolesError) {
        console.error('Error fetching roles:', rolesError);
    } else {
        console.table(roles);
    }
}

checkUsers();
