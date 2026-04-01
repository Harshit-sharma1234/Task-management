import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProjectList } from '@/components/dashboard/ProjectList';
import { getCachedProjects, getCachedUsers } from '@/lib/cache';
import { Suspense } from 'react';

export default async function ProjectsPage() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        redirect('/login');
    }

    return (
        <Suspense fallback={<ProjectsLoadingSkeleton />}>
            <ProjectsContent />
        </Suspense>
    );
}

async function ProjectsContent() {
    // Fetch cached projects and users in parallel
    const [projects, users] = await Promise.all([
        getCachedProjects(),
        getCachedUsers()
    ]);

    const typedUsers = (users || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar_url: u.avatar_url || null
    }));

    // Create an efficient dictionary to map lead_id to actual user names
    const userMap = typedUsers.reduce((acc: Record<string, string>, u: any) => {
        acc[u.id] = u.name;
        return acc;
    }, {});

    return (
        <div className="flex flex-col h-full w-full bg-[#fbfbfb]">
            <ProjectList 
                projects={projects} 
                users={typedUsers} 
                userMap={userMap} 
            />
        </div>
    );
}

function ProjectsLoadingSkeleton() {
    return (
        <div className="flex flex-col h-full w-full bg-[#fbfbfb] p-8 animate-pulse">
            <div className="h-8 w-48 bg-gray-200 rounded mb-6" />
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-lg" />
                ))}
            </div>
        </div>
    );
}
