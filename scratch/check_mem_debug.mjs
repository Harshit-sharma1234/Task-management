
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMemberships() {
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, email, name')
    .limit(1);

  if (userError) {
    console.error('Error fetching users:', userError);
    return;
  }

  if (!users || users.length === 0) {
    console.log('No users found');
    return;
  }

  const user = users[0];
  console.log('Checking memberships for user:', user.email);

  const { data: memberships, error: memError } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(name, slug), roles(role_name)')
    .eq('user_id', user.id);

  if (memError) {
    console.error('Error fetching memberships:', memError);
    return;
  }

  console.log('Memberships found:', JSON.stringify(memberships, null, 2));
}

checkMemberships();
