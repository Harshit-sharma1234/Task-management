const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProjects() {
    const emails = ['kapilnainanidev6@gmail.com', 'harshit.sharma@tectome.co.uk'];
    
    for (const email of emails) {
        console.log(`\n--- Checking for user: ${email} ---`);
        const { data: user } = await supabase.from('users').select('id, email').eq('email', email).maybeSingle();
        
        if (!user) {
            console.log(`User not found in public.users table.`);
            continue;
        }
        
        console.log(`Found Profile ID: ${user.id}`);
        
        const { data: memberships, count } = await supabase
            .from('project_members')
            .select('id, project_id, projects(project_name, workspace_id)', { count: 'exact' })
            .eq('user_id', user.id);
            
        console.log(`Project memberships count: ${count}`);
        if (memberships && memberships.length > 0) {
            memberships.forEach(m => {
                console.log(`- Project: ${m.projects?.project_name} (Workspace ID: ${m.projects?.workspace_id})`);
            });
        } else {
            console.log('No project memberships found.');
        }

        const { data: leads, count: leadCount } = await supabase
            .from('projects')
            .select('id, project_name, workspace_id', { count: 'exact' })
            .eq('lead_id', user.id);
            
        console.log(`Lead on projects count: ${leadCount}`);
        if (leads && leads.length > 0) {
            leads.forEach(p => {
                console.log(`- Lead of: ${p.project_name} (Workspace ID: ${p.workspace_id})`);
            });
        }
    }
}

checkProjects();
