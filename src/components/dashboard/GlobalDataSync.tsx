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
export function GlobalDataSync({ initialData }: GlobalDataSyncProps) {
    const hasHydrated = useRef(false);
    const { setProjects, setTeam, setInitialLoadComplete, setActiveWorkspaceId, updateProject } = useGlobalStore();
    const { setTeamData } = useTeamStore();
    const { setUnreadCount } = useNotificationStore();
    const supabase = createClient();

    // IMMEDIATE HYDRATION
    if (initialData && !hasHydrated.current) {
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
        hasHydrated.current = true;
    }

    useEffect(() => {
        if (!initialData?.userId) return;

        // Projects Sync
        const projectChannel = supabase
            .channel('global-projects-sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
                if (payload.eventType === 'UPDATE') {
                    updateProject(payload.new);
                }
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
            supabase.removeChannel(notifChannel);
        }
    }, [initialData?.userId]);

    return null;
}
