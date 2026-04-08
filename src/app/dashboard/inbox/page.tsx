import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import InboxClient from './InboxClient';

export default async function InboxPage() {
    const supabase = await createClient();

    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

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

    // 3. Pre-fetch entity detail for the first notification (if any)
    let initialSelectedId: string | null = null;
    let initialEntityDetail: any = null;
    let initialEntityActivity: any[] = [];

    const firstNotification = notifications[0];
    if (firstNotification?.entity_id) {
        initialSelectedId = firstNotification.id;

        if (firstNotification.entity_type === 'ticket') {
            // Fetch ticket + comments + logs in parallel (kills 3 more sequential round-trips)
            const [ticketRes, commentsRes, logsRes] = await Promise.all([
                supabase
                    .from('tickets')
                    .select(`
                        *,
                        projects (id, project_name),
                        created_by_user: users!created_by(id, name, email, avatar_url),
                        assigned_to_user: users!assignee_id(id, name, email, avatar_url)
                    `)
                    .eq('id', firstNotification.entity_id)
                    .maybeSingle(),
                supabase
                    .from('comments')
                    .select('*, users(id, name, email, avatar_url)')
                    .eq('ticket_id', firstNotification.entity_id)
                    .order('created_at', { ascending: true }),
                supabase
                    .from('logs')
                    .select('*, users(id, name)')
                    .eq('ticket_id', firstNotification.entity_id)
                    .order('created_at', { ascending: true }),
            ]);

            if (ticketRes.error) {
                // Fallback to simpler fetch if join failed
                const fallback = await supabase
                    .from('tickets')
                    .select('*, projects(id, project_name)')
                    .eq('id', firstNotification.entity_id)
                    .maybeSingle();

                if (fallback.data) {
                    initialEntityDetail = { type: 'ticket', data: fallback.data };
                }
            } else if (ticketRes.data) {
                initialEntityDetail = { type: 'ticket', data: ticketRes.data };
            }

            const activity = [
                ...(commentsRes.data || []).map((c: any) => ({ ...c, activityType: 'comment' })),
                ...(logsRes.data || []).map((l: any) => ({ ...l, activityType: 'log' })),
            ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            initialEntityActivity = activity;

        } else if (firstNotification.entity_type === 'project') {
            const { data, error } = await supabase
                .from('projects')
                .select('*, lead:users!lead_id(id, name, email, avatar_url)')
                .eq('id', firstNotification.entity_id)
                .maybeSingle();

            if (error) {
                const fallback = await supabase
                    .from('projects')
                    .select('id, project_name')
                    .eq('id', firstNotification.entity_id)
                    .maybeSingle();

                if (fallback.data) {
                    initialEntityDetail = { type: 'project', data: fallback.data };
                }
            } else if (data) {
                initialEntityDetail = { type: 'project', data };
            }
        }
    }

    return (
        <InboxClient
            initialNotifications={notifications}
            allUsers={allUsers}
            currentUser={user}
            initialSelectedId={initialSelectedId}
            initialEntityDetail={initialEntityDetail}
            initialEntityActivity={initialEntityActivity}
        />
    );
}
