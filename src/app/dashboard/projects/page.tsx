import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProjectList } from '@/components/dashboard/ProjectList';
import { getCachedProjects, getCachedUsers } from '@/lib/cache';
import { Suspense } from 'react';
import { Metadata } from 'next';

import { ProjectSkeleton } from '@/components/dashboard/ProjectSkeleton';

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Manage and view all your active workspaces and projects.',
};

export default function ProjectsPage() {
    return (
        <Suspense fallback={<ProjectSkeleton />}>
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
