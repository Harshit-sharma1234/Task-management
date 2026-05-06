'use client';

import { useEffect, useRef } from 'react';
import { useGlobalStore } from '@/lib/store/global';
import { useTeamStore } from '@/lib/store/team';
import { useNotificationStore } from '@/lib/store/notifications';
import { useSettingsStore } from '@/lib/store/settings';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

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
    const { setUserData } = useSettingsStore();
    const supabase = createClient();

    // IMMEDIATE HYDRATION / RE-HYDRATION ON WORKSPACE CHANGE
    const currentStoreTeam = useTeamStore.getState().users;
    const isNewWorkspace = initialData && initialData.activeWorkspaceId !== lastHydratedWorkspaceId;
    const isStoreEmpty = currentStoreTeam.length === 0;

    if (initialData && (isNewWorkspace || isStoreEmpty)) {
        // Only set data if the store is empty or we truly switched workspaces
        // This prevents old "initialData" from overwriting fresh Realtime data
        if (isNewWorkspace || isStoreEmpty) {
            setProjects(initialData.projects);
            setTeam(initialData.team);
            setTeamData(
                initialData.team, 
                initialData.profile?.roles?.role_name === 'Admin', 
                initialData.profile?.roles?.role_name || null,
                initialData.activeWorkspaceId || ''
            );
            setUnreadCount(initialData.unreadCount);
            if (initialData.profile) {
                setUserData(initialData.profile);
            }
            if (initialData.activeWorkspaceId) {
                setActiveWorkspaceId(initialData.activeWorkspaceId);
            }
            setInitialLoadComplete(true);
            lastHydratedWorkspaceId = initialData.activeWorkspaceId || null;
        }
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

        // Team Realtime Sync - Scoped to current workspace
        const teamChannel = supabase
            .channel(`team-sync-global`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'workspace_members'
            }, (payload) => {
                const newData = payload.new as any;
                const oldData = payload.old as any;
                const workspaceId = newData?.workspace_id || oldData?.workspace_id;

                if (workspaceId === initialData.activeWorkspaceId) {
                    console.log('[GlobalDataSync] Team membership changed (postgres), refreshing in 200ms...');
                    // Small delay to ensure DB consistency before fetching
                    setTimeout(() => {
                        const { refresh } = useTeamStore.getState();
                        refresh();
                    }, 200);
                }
            })
            .on('broadcast', { event: 'membership_change' }, (payload) => {
                const data = payload.payload || payload;
                if (data.workspace_id === initialData.activeWorkspaceId) {
                    if (data.new_member) {
                        console.log('[GlobalDataSync] Immediate member injection via broadcast');
                        const { users, setTeamData, isAdmin, currentUserRole } = useTeamStore.getState();
                        if (!users.some(u => u.id === data.new_member.id)) {
                            setTeamData([...users, data.new_member], isAdmin, currentUserRole, data.workspace_id);
                            toast.success(`New member joined: ${data.new_member.name || data.new_member.email}`);
                        }
                    } else {
                        const { refresh } = useTeamStore.getState();
                        refresh();
                    }
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') console.log('[GlobalDataSync] Team channel active');
                if (status === 'CHANNEL_ERROR') console.error('[GlobalDataSync] Team channel failed');
            });

        // Notifications Sync
        const notifChannel = supabase
            .channel(`notif-sync-${initialData.userId}`)
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
                toast.success('New notification received');
            })
            .subscribe();

        // Workspace Realtime Sync (Name/Logo)
        const workspaceChannel = supabase
            .channel(`workspace-sync-${initialData.activeWorkspaceId}`)
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'workspaces',
                filter: `id=eq.${initialData.activeWorkspaceId}`
            }, (payload) => {
                toast.info('Workspace settings updated');
                window.dispatchEvent(new CustomEvent('workspace-updated', { detail: payload.new }));
            })
            .subscribe();

        // User Profile Realtime Sync
        const profileChannel = supabase
            .channel(`profile-sync-${initialData.userId}`)
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'users',
                filter: `id=eq.${initialData.userId}`
            }, (payload) => {
                setUserData(payload.new);
                toast.success('Profile updated');
            })
            .subscribe();

        return () => {
            supabase.removeChannel(projectChannel);
            supabase.removeChannel(teamChannel);
            supabase.removeChannel(notifChannel);
            supabase.removeChannel(workspaceChannel);
            supabase.removeChannel(profileChannel);
        }
    }, [initialData?.userId, initialData?.activeWorkspaceId]);

    return null;
}
