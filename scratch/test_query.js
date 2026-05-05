const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('workspace_invites')
    .select('*, workspaces(name, slug), roles(role_name)')
    .limit(1);
  console.log('DATA:', data);
  if (error) console.error('ERROR:', error);
}
run();
