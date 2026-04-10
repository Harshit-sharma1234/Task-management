import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('users')
    .select('*, roles(role_name)')
    .limit(1);
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('User Data Sample:', JSON.stringify(data?.[0], null, 2));
  }
}

check();
