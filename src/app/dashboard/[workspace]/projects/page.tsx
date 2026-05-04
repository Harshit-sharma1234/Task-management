'use client';




import { ProjectList } from '@/components/dashboard/ProjectList';
import { useGlobalStore } from '@/lib/store/global';
import { ProjectSkeleton } from '@/components/dashboard/ProjectSkeleton';
import { useTeamStore } from '@/lib/store/team';
import { useMemo, Suspense } from 'react';

/**
 * ProjectsPage is now a Client Component that consumes the Global Sync State.
 * This ensures that if the data was already fetched by the Layout on login,
 * switching to this tab is INSTANT with zero network overhead.
 */
export default function ProjectsPage() {
    const projects = useGlobalStore(state => state.projects);
    const isInitialLoadComplete = useGlobalStore(state => state.isInitialLoadComplete);
    const users = useTeamStore(state => state.users);
    const currentUserRole = useTeamStore(state => state.currentUserRole);

    const activeWorkspaceId = useGlobalStore(state => state.activeWorkspaceId);

    const userMap = useMemo(() => {
        return (users || []).reduce((acc: Record<string, string>, u: any) => {
            acc[u.id] = u.name;
            return acc;
        }, {});
    }, [users]);

    if (!isInitialLoadComplete) {
        return <ProjectSkeleton />;
    }

    return (
        <div className="flex flex-col h-full w-full bg-[#fbfbfb]">
            <Suspense fallback={<ProjectSkeleton />}>
                <ProjectList 
                    projects={projects} 
                    users={users} 
                    userMap={userMap} 
                    userRole={currentUserRole as any}
                    workspaceId={activeWorkspaceId || undefined}
                />
            </Suspense>
        </div>
    );
}
