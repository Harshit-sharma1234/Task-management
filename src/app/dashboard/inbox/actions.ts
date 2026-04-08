'use server';

import { createClient } from '@/lib/supabase/server';

export async function fetchEntityDetailAction(entityId: string, entityType: string) {
    const supabase = await createClient();

    if (entityType === 'ticket') {
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
                .select('*, users(id, name, email, avatar_url)')
                .eq('ticket_id', entityId)
                .order('created_at', { ascending: true }),
            supabase
                .from('logs')
                .select('*, users(id, name)')
                .eq('ticket_id', entityId)
                .order('created_at', { ascending: true })
        ]);

        let detailData = ticketRes.data;
        if (ticketRes.error) {
            console.error('[Action] Ticket fetch error:', ticketRes.error);
            const fallback = await supabase
                .from('tickets')
                .select('*, projects(id, project_name)')
                .eq('id', entityId)
                .maybeSingle();
            detailData = fallback.data;
        }

        const activity = [
            ...(commentsRes.data || []).map(c => ({ ...c, activityType: 'comment' })),
            ...(logsRes.data || []).map(l => ({ ...l, activityType: 'log' })),
        ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        return { detail: detailData, activity, error: null };
    } else if (entityType === 'project') {
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

    return { detail: null, activity: [], error: 'Unknown entity type' };
}
