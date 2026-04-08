import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import InboxClient from './InboxClient';
import { getServerUser } from '@/lib/auth-server';

export default async function InboxPage() {
    // 1. Get current user (Deduplicated with Layout)
    const user = await getServerUser();
    if (!user) redirect('/login');

    const supabase = await createClient();

    // 2. Fetch notifications + users in parallel (kills 2 sequential round-trips)
    const [notificationsRes, usersRes] = await Promise.all([
        supabase
            .from('notifications')
            .select(`
                *,
                actor:actor_id(id, name, email, avatar_url)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
        supabase
            .from('users')
            .select('id, name')
            .order('name'),
    ]);

    const notifications = notificationsRes.data || [];
    const allUsers = usersRes.data || [];

    // 3. Keep initial detail null to allow static shell to render immediately
    // InboxClient will trigger fetchEntityDetail on mount if initialSelectedId exists.
    const initialSelectedId = notifications[0]?.id || null;

    return (
        <InboxClient
            initialNotifications={notifications}
            allUsers={allUsers}
            currentUser={user}
            initialSelectedId={initialSelectedId}
            initialEntityDetail={null}
            initialEntityActivity={[]}
        />
    );
}
