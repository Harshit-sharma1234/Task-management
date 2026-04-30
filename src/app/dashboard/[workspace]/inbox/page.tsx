import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import InboxClient from './InboxClient';
import { getServerUser } from '@/lib/auth-server';
import { getCachedUsersMinimal, getCachedWorkspaceBySlug, getCachedWorkspaceMember } from '@/lib/cache';

export default async function InboxPage({ params }: { params: Promise<{ workspace: string }> }) {
    // 1. Get current user (Deduplicated with Layout)
    const user = await getServerUser();
    if (!user) redirect('/login');

    const { workspace: workspaceSlug } = await params;
    const workspace = await getCachedWorkspaceBySlug(workspaceSlug);

    if (!workspace) {
        redirect('/dashboard');
    }

    const supabase = await createClient();

    // 2. Fetch notifications + workspace users in parallel
    const [notificationsRes, allUsers] = await Promise.all([
        supabase
            .from('notifications')
            .select(`
                *,
                actor:users!actor_id(id, name, email, avatar_url)
            `)
            .eq('user_id', user.id)
            .eq('workspace_id', workspace.id)
            .order('created_at', { ascending: false }),
        getCachedUsersMinimal(workspace.id)
    ]);

    const notifications = (notificationsRes.data || []).map(n => {
        const actor = Array.isArray(n.actor) ? n.actor[0] : n.actor;
        return { ...n, actor };
    });

    // 3. Keep initial detail null to allow static shell to render immediately
    // InboxClient will trigger fetchEntityDetail on mount if initialSelectedId exists.
    const initialSelectedId = notifications[0]?.id || null;

    const member = await getCachedWorkspaceMember(workspace.id, user.id);
    const currentUserWithRoles = { ...user, roles: member?.roles || null };

    return (
        <InboxClient
            initialNotifications={notifications}
            allUsers={allUsers}
            workspaceId={workspace.id}
            currentUser={currentUserWithRoles}
            initialSelectedId={initialSelectedId}
            initialEntityDetail={null}
            initialEntityActivity={[]}
        />
    );
}

