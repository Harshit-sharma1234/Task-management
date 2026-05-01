import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(l => l.split('=')));

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('workspace_invites')
    .select('*')
    .eq('token', '2a98ab1518ed561e15ff43af9956f72d9431b2c38d66bca525740c7eec28ad0c');
  console.log('DATA:', data);
  if (error) console.error('ERROR:', error);
}
run();
