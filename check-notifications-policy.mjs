import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT * FROM pg_policies WHERE tablename = \'notifications\';' });
  if (error) {
      console.log('Cant run RPC, trying to query raw sql via admin role if exposed', error);
  } else {
      console.log(data);
  }
}
run();
