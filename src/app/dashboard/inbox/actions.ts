'use server';

import { createClient } from '@/lib/supabase/server';

export async function fetchEntityDetailAction(entityId: string, entityType: string) {
    const supabase = await createClient();

    // Normalize entityType to underlying model
    const normalizedType = ['assignment', 'status_change', 'comment', 'ticket', 'issue'].includes(entityType)
        ? 'ticket'
        : ['project', 'member_add'].includes(entityType)
            ? 'project'
            : entityType;

    if (normalizedType === 'ticket') {
        const [ticketRes, commentsRes, logsRes] = await Promise.all([
            supabase
                .from('tickets')
                .select(`
                    *,
                    projects (id, project_name),
                    created_by_user: users!created_by(id, name, email, avatar_url),
                    assigned_to_user: users!assignee_id(id, name, email, avatar_url)
                `)
                .eq('id', entityId)
                .maybeSingle(),
            supabase
                .from('comments')
                .select('*, users:user_id(id, name, email, avatar_url)')
                .eq('ticket_id', entityId)
                .order('created_at', { ascending: true }),
            supabase
                .from('logs')
                .select('*, users:user_id(id, name, avatar_url)')
                .eq('ticket_id', entityId)
                .order('created_at', { ascending: true })
        ]);

        let detailData = ticketRes.data;
        if (detailData) {
            if (Array.isArray(detailData.created_by_user)) detailData.created_by_user = detailData.created_by_user[0];
            if (Array.isArray(detailData.assigned_to_user)) detailData.assigned_to_user = detailData.assigned_to_user[0];
            const project = Array.isArray(detailData.projects) ? detailData.projects[0] : detailData.projects;
            detailData.projects = project;
        }
        
        if (ticketRes.error) {
            console.error('[Action] Ticket fetch error:', ticketRes.error);
            const fallbackRes = await supabase
                .from('tickets')
                .select('*, projects(id, project_name)')
                .eq('id', entityId)
                .maybeSingle();
            detailData = fallbackRes.data;
            if (detailData && Array.isArray(detailData.projects)) {
                detailData.projects = detailData.projects[0];
            }
        }

        const activity = [
            ...(commentsRes.data || []).map(c => {
                const u = Array.isArray(c.users) ? c.users[0] : c.users;
                return { ...c, users: u, activityType: 'comment' };
            }),
            ...(logsRes.data || []).map(l => {
                const u = Array.isArray(l.users) ? l.users[0] : l.users;
                return { ...l, users: u, activityType: 'log' };
            }),
        ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        return { detail: detailData, activity, error: null };
    } else if (normalizedType === 'project') {
        // Fetch project and its lead in a single query
        const { data, error } = await supabase
            .from('projects')
            .select('*, lead:users!lead_id(id, name, email, avatar_url)')
            .eq('id', entityId)
            .maybeSingle();

        if (error || !data) {
            // Log once and return minimal error state or fallback
            console.error(`[Inbox] Project fetch error for ${entityId}:`, error);
            return { detail: null, activity: [], error: 'Project not found' };
        }
        
        return { detail: data, activity: [], error: null };
    }

    return { detail: null, activity: [], error: `Unknown entity type: ${entityType}` };
}
