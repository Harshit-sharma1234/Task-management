import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hkvolrsnqttkmysalbha.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: workspaces } = await supabase.from('workspaces').select('id, name, slug');
  console.log('Workspaces:', workspaces);

  for (const ws of workspaces) {
    const { data: members, count } = await supabase
      .from('workspace_members')
      .select('user_id', { count: 'exact' })
      .eq('workspace_id', ws.id);
    
    console.log(`Workspace ${ws.name} (${ws.slug}): ${count} members`);
    
    const { data: users } = await supabase.from('users').select('id, name, email').in('id', (members || []).map(m => m.user_id));
    console.log('Members:', users?.map(u => u.email).join(', '));
  }
}

check();
