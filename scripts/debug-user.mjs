import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hkvolrsnqttkmysalbha.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debug() {
  // 1. Check auth users
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
  console.log('\n=== AUTH USERS ===');
  for (const u of authUsers) {
    console.log(`  ${u.email} | auth_id: ${u.id} | provider: ${u.app_metadata?.provider}`);
  }

  // 2. Check public.users table
  const { data: publicUsers } = await supabase.from('users').select('id, auth_id, email, name');
  console.log('\n=== PUBLIC USERS TABLE ===');
  for (const u of (publicUsers || [])) {
    console.log(`  ${u.email} | id: ${u.id} | auth_id: ${u.auth_id} | name: ${u.name}`);
  }

  // 3. Check workspace memberships
  const { data: members } = await supabase.from('workspace_members').select('user_id, workspace_id, workspaces(slug), roles(role_name)');
  console.log('\n=== WORKSPACE MEMBERS ===');
  for (const m of (members || [])) {
    console.log(`  user_id: ${m.user_id} | workspace: ${m.workspaces?.slug} | role: ${m.roles?.role_name}`);
  }

  // 4. Cross-reference: find auth users without a public profile
  const publicAuthIds = new Set((publicUsers || []).map(u => u.auth_id));
  console.log('\n=== AUTH USERS MISSING FROM PUBLIC.USERS ===');
  for (const u of authUsers) {
    if (!publicAuthIds.has(u.id)) {
      console.log(`  ⚠️  ${u.email} (auth_id: ${u.id}) has NO public profile!`);
    }
  }
}

debug();
