import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProjectList } from '@/components/dashboard/ProjectList';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProjectsPage() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        redirect('/login')
    }

    // Fetch all projects
    const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

    const projects = projectsData || []

    // Fetch users for mapping
    const { data: usersData } = await supabase
        .from('users')
        .select('id, name, email, avatar_url')
        
    const users = (usersData || []) as { id: string, name: string, email: string, avatar_url?: string | null }[]
    
    // Create an efficient dictionary to map lead_id to actual user names
    const userMap = users.reduce((acc, u) => {
        acc[u.id] = u.name
        return acc
    }, {} as Record<string, string>)

    return (
        <div className="flex flex-col h-full w-full bg-[#fbfbfb]">
            <ProjectList 
                projects={projects} 
                users={users} 
                userMap={userMap} 
            />
        </div>
    )
}
