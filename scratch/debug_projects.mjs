import { createAdminClient } from '../src/lib/supabase/admin.js';

async function check() {
    const supabase = createAdminClient();
    
    // Get user "kapil"
    const { data: user } = await supabase.from('users').select('*').ilike('name', '%kapil%').single();
    if (!user) {
        console.log('User kapil not found');
        return;
    }
    console.log('User:', { id: user.id, name: user.name });

    // Get projects for this workspace
    // We need a workspace. Let's find workspaces for kapil.
    const { data: members } = await supabase.from('workspace_members').select('workspace_id, workspaces(name, slug)').eq('user_id', user.id);
    console.log('Workspaces:', members.map(m => m.workspaces));

    for (const m of members) {
        const wsId = m.workspace_id;
        const { data: projects } = await supabase.from('projects').select('id, project_name, lead_id').eq('workspace_id', wsId);
        console.log(`Projects in ${m.workspaces.name}:`, projects.map(p => ({
            name: p.project_name,
            lead_id: p.lead_id,
            is_lead: p.lead_id === user.id
        })));
        
        const { data: memberships } = await supabase.from('project_members').select('project_id').eq('user_id', user.id);
        console.log(`Project memberships for ${user.name}:`, memberships);
    }
}

check();
