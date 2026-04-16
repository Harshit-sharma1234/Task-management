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
    }
}

/**
 * GlobalDataSync handles the "Single Source of Truth" hydration strategy.
 * It hydrates the store either from initial props or a fallback fetch,
 * and maintains realtime listeners.
 */
export function GlobalDataSync({ initialData }: GlobalDataSyncProps) {
    const hasHydrated = useRef(false);
    const { setProjects, setTeam, setInitialLoadComplete, updateProject } = useGlobalStore();
    const { setTeamData } = useTeamStore();
    const { setUnreadCount } = useNotificationStore();
    const supabase = createClient();

    // 1. IMMEDIATE HYDRATION (Sync)
    // We do this outside useEffect if initialData is provided to prevent a frame of empty state
    if (initialData && !hasHydrated.current) {
        setProjects(initialData.projects);
        setTeam(initialData.team);
        setTeamData(initialData.team, initialData.profile?.roles?.role_name === 'Admin', initialData.profile?.roles?.role_name || null);
        setUnreadCount(initialData.unreadCount);
        setInitialLoadComplete(true);
        hasHydrated.current = true;
    }

    useEffect(() => {
        // Real-time Subscriptions logic stays here
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
