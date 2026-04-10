import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://hkvolrsnqttkmysalbha.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data } = await supabase.from('users').select('*, roles(role_name)');
  console.log(JSON.stringify(data?.[0], null, 2));
}
run();
