const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPermissions() {
  // Fetch a few recent tickets with their assignee and reviewer
  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('id, title, status, assignee_id, reviewer_id')
    .order('updated_at', { ascending: false })
    .limit(5);

  if (ticketsError) {
    console.error('Error fetching tickets:', ticketsError);
    return;
  }

  console.log('Recent Tickets:');
  console.table(tickets);

  // Fetch the members of a workspace to see roles
  const { data: members, error: membersError } = await supabase
    .from('workspace_members')
    .select('user_id, workspace_id, roles(role_name)')
    .limit(10);

  if (membersError) {
    console.error('Error fetching members:', membersError);
    return;
  }

  console.log('Workspace Members:');
  console.log(JSON.stringify(members, null, 2));
}

checkPermissions();
