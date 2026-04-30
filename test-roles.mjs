import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('roles').select('*');
  console.log('roles:', data?.length, error?.message);
  const { data: d2, error: e2 } = await supabase.from('workspace_roles').select('*');
  console.log('workspace_roles:', d2?.length, e2?.message);
  const { data: d3, error: e3 } = await supabase.from('workspaces_roles').select('*');
  console.log('workspaces_roles:', d3?.length, e3?.message);
}
check();
