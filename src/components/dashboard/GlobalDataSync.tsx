'use client';

import { useEffect, useRef } from 'react';
import { useGlobalStore } from '@/lib/store/global';
import { useTeamStore } from '@/lib/store/team';
import { useNotificationStore } from '@/lib/store/notifications';
import { createClient } from '@/lib/supabase/client';

interface GlobalDataSyncProps {
    initialData?: {
        projects: any[];
        team: any[];
        profile: any;
        userId: string;
        unreadCount: number;
        activeWorkspaceId?: string;
    }
}

/**
 * GlobalDataSync handles the "Single Source of Truth" hydration strategy.
 * Hydrates stores from server-provided initial data and maintains realtime listeners.
 */
/**
 * Track the last hydrated workspace globally (survives re-mounts during navigation)
 */
let lastHydratedWorkspaceId: string | null = null;

export function GlobalDataSync({ initialData }: GlobalDataSyncProps) {
    const { setProjects, setTeam, setInitialLoadComplete, setActiveWorkspaceId, updateProject } = useGlobalStore();
    const { setTeamData } = useTeamStore();
    const { setUnreadCount } = useNotificationStore();
    const supabase = createClient();

    // IMMEDIATE HYDRATION / RE-HYDRATION ON WORKSPACE CHANGE
    if (initialData && (initialData.activeWorkspaceId !== lastHydratedWorkspaceId)) {
        setProjects(initialData.projects);
        setTeam(initialData.team);
        setTeamData(
            initialData.team, 
            initialData.profile?.roles?.role_name === 'Admin', 
            initialData.profile?.roles?.role_name || null,
            initialData.activeWorkspaceId || ''
        );
        setUnreadCount(initialData.unreadCount);
        if (initialData.activeWorkspaceId) {
            setActiveWorkspaceId(initialData.activeWorkspaceId);
        }
        setInitialLoadComplete(true);
        lastHydratedWorkspaceId = initialData.activeWorkspaceId || null;
    }

    useEffect(() => {
        if (!initialData?.userId) return;

        // Projects Realtime Sync
        const projectChannel = supabase
            .channel('global-projects-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    useGlobalStore.getState().addProject(payload.new);
                } else if (payload.eventType === 'UPDATE') {
                    useGlobalStore.getState().updateProject(payload.new);
                } else if (payload.eventType === 'DELETE') {
                    useGlobalStore.getState().removeProject(payload.old.id);
                }
            })
            .subscribe();

        // Team Realtime Sync
        const teamChannel = supabase
            .channel('global-team-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_members' }, async (payload) => {
                // If team changes, it's safer to just trigger a refresh of the team store
                // because workspace_members doesn't contain the full user object needed for the UI.
                const { refresh } = useTeamStore.getState();
                refresh();
            })
            .subscribe();

        // Notifications Sync
        const notifChannel = supabase
            .channel('global-notifications-sync')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'notifications',
                filter: `user_id=eq.${initialData.userId}`
            }, async () => {
                const { count } = await supabase
                    .from('notifications')
                    .select('*', { count: 'estimated', head: true })
                    .eq('user_id', initialData.userId)
                    .eq('is_read', false);
                setUnreadCount(count || 0);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(projectChannel);
            supabase.removeChannel(teamChannel);
            supabase.removeChannel(notifChannel);
        }
    }, [initialData?.userId]);

    return null;
}
