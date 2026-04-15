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
        // Fetch ticket data first
        const ticketRes = await supabase
            .from('tickets')
            .select(`
                *,
                projects (id, project_name),
                created_by_user: users!created_by(id, name, email, avatar_url),
                assigned_to_user: users!assignee_id(id, name, email, avatar_url)
            `)
            .eq('id', entityId)
            .maybeSingle();

        // Fetch comments and logs separately to avoid relationship ambiguity
        const [commentsRes, logsRes] = await Promise.all([
            supabase
                .from('comments')
                .select('*')
                .eq('ticket_id', entityId)
                .order('created_at', { ascending: true }),
            supabase
                .from('logs')
                .select('*')
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

        // Collect all user IDs from comments and logs
        const commentUserIds = Array.from(new Set((commentsRes.data || []).map(c => c.user_id).filter(Boolean)));
        const logUserIds = Array.from(new Set((logsRes.data || []).map(l => l.user_id).filter(Boolean)));
        const allUserIds = Array.from(new Set([...commentUserIds, ...logUserIds]));

        // Fetch users separately
        let usersData: any[] = [];
        if (allUserIds.length > 0) {
            const { data: users } = await supabase
                .from('users')
                .select('id, name, email, avatar_url')
                .in('id', allUserIds);
            usersData = users || [];
        }

        // Create user lookup map
        const userMap = new Map(usersData.map(u => [u.id, u]));

        // Map activity with user data
        const activity = [
            ...(commentsRes.data || []).map(c => ({
                ...c,
                users: userMap.get(c.user_id) || null,
                activityType: 'comment' as const
            })),
            ...(logsRes.data || []).map(l => ({
                ...l,
                users: userMap.get(l.user_id) || null,
                activityType: 'log' as const
            })),
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
