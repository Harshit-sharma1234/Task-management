import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hkvolrsnqttkmysalbha.supabase.co',
  'sb_secret_Fb-_1x3VN-B9UFrPGaLMGw_vC-gHL_K'
);

async function migrateData() {
  const { data: workspace } = await supabase.from('workspaces').select('id').eq('slug', 'tectome').single();
  if (!workspace) {
    console.error('Tectome workspace not found');
    return;
  }
  
  console.log('Migrating projects to workspace:', workspace.id);
  
  const { error: pError } = await supabase
    .from('projects')
    .update({ workspace_id: workspace.id })
    .neq('workspace_id', workspace.id);

  if (pError) console.error('Project migration error:', pError);

  // 2. Migrate tickets for these projects (or all orphaned tickets)
  const { error: tError } = await supabase
    .from('tickets')
    .update({ workspace_id: workspace.id })
    .neq('workspace_id', workspace.id);

  if (tError) console.error('Ticket migration error:', tError);
  
  const { data: projects } = await supabase.from('projects').select('id, project_name, workspace_id');
  console.log('Final Projects:', JSON.stringify(projects, null, 2));
}

migrateData();
