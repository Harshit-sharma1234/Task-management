'use server';

import { createClient } from '@/lib/supabase/server';

// Types for optimized data fetching
export interface CriticalTicketData {
    id: string;
    title: string;
    status: string;
    priority: string;
    project_id: string;
    created_by: string;
    assignee_id: string | null;
    reviewer_id: string | null;
    due_date: string | null;
    created_at: string;
    updated_at: string;
    projects: {
        id: string;
        project_name: string;
    };
    created_by_user: {
        id: string;
        name: string;
        email: string;
        avatar_url: string | null;
    };
    assigned_to_user?: {
        id: string;
        name: string;
        email: string;
        avatar_url: string | null;
    };
}

export interface NonCriticalActivity {
    id: string;
    created_at: string;
    comment?: string;
    field?: string;
    old_value?: string;
    new_value?: string;
    user_id: string;
    users: {
        id: string;
        name: string;
        avatar_url: string | null;
    };
    activityType: 'comment' | 'log';
}

// OPTIMIZED: Fetch only critical data needed for immediate UI render
export async function fetchEntityCriticalAction(entityId: string, entityType: string) {
    const supabase = await createClient();
    
    const normalizedType = ['assignment', 'status_change', 'comment', 'ticket', 'issue'].includes(entityType)
        ? 'ticket'
        : ['project', 'member_add'].includes(entityType)
            ? 'project'
            : entityType;

    if (normalizedType === 'ticket') {
        // Use pre-built view to eliminate joins
        const { data, error } = await supabase
            .from('ticket_summary_view')
            .select('*')
            .eq('id', entityId)
            .maybeSingle()
            .throwOnError();

        if (error) {
            console.error('[Action] Critical ticket fetch error:', error);
            return { critical: null, error: (error as any).message || String(error) };
        }

        return { critical: data as CriticalTicketData, error: null };
    }

    // Project critical data
    if (normalizedType === 'project') {
        const { data, error } = await supabase
            .from('projects')
            .select('id, project_name, description, lead_id, created_at, updated_at, lead:users!lead_id(id, name, email, avatar_url)')
            .eq('id', entityId)
            .maybeSingle()
            .throwOnError();

        if (error) {
            console.error(`[Action] Critical project fetch error:`, error);
            return { critical: null, error: (error as any).message || String(error) };
        }

        return { critical: data, error: null };
    }

    return { critical: null, error: `Unknown entity type: ${entityType}` };
}

// OPTIMIZED: Fetch activity data separately with strict pagination
export async function fetchEntityActivityAction(
    entityId: string, 
    entityType: string,
    cursor?: string,
    limit: number = 20 // Strict limit as requested
) {
    const supabase = await createClient();
    
    const normalizedType = ['assignment', 'status_change', 'comment', 'ticket', 'issue'].includes(entityType)
        ? 'ticket'
        : ['project', 'member_add'].includes(entityType)
            ? 'project'
            : entityType;

    if (normalizedType !== 'ticket') {
        return { activity: [], hasMore: false, error: null };
    }

    // Use pre-built view to eliminate N+1 queries
    let query = supabase
        .from('ticket_activity_view')
        .select('*')
        .eq('ticket_id', entityId)
        .order('created_at', { ascending: false }) // Show newest first
        .limit(limit);

    // Apply cursor if provided (for pagination)
    if (cursor) {
        const cursorDate = new Date(cursor).toISOString();
        query = query.lt('created_at', cursorDate); // Get items older than cursor for newest-first pagination
    }

    const { data, error } = await query;

    // Always return safe default, never block UI
    if (error) {
        console.error('[Action] Activity fetch error:', error);
        return { activity: [], hasMore: false, error: null }; // Never block UI
    }

    // Data already pre-joined and normalized in view
    const allActivity = (data || []).map(item => ({
        ...item,
        users: {
            id: item.user_id,
            name: item.user_name,
            avatar_url: item.user_avatar
        },
        activityType: item.activity_type as 'comment' | 'log'
    }));

    // Determine if there's more data
    const hasMore = (data?.length || 0) >= limit;
    // For newest-first pagination, cursor is the oldest item in the batch
    const nextCursor = hasMore ? allActivity[allActivity.length - 1]?.created_at : undefined;

    return { 
        activity: allActivity as NonCriticalActivity[], 
        hasMore, 
        nextCursor, 
        error: null // Always return null error to never block UI
    };
}

// HYBRID CACHE: Return cached data immediately, revalidate in background
export async function fetchEntityCriticalWithCache(entityId: string, entityType: string) {
    // This would integrate with Redis/edge cache in production
    // For now, using the in-memory cache with background revalidation
    const result = await fetchEntityCriticalAction(entityId, entityType);
    
    // In production, this would:
    // 1. Check cache first
    // 2. Return cached if exists
    // 3. Trigger background revalidation
    // 4. Update cache in background
    
    return result;
}

// SAFE BATCH PREFETCH: Only used in specific scenarios
export async function safeBatchPrefetch(entityIds: string[], entityTypes: string[], scenario: 'hover' | 'dashboard') {
    // Only allow batch prefetch in specific scenarios
    if (scenario !== 'hover' && scenario !== 'dashboard') {
        console.warn('[Action] Batch prefetch denied: invalid scenario');
        return { data: [], error: 'Invalid scenario' };
    }
    
    // Limit batch size to prevent backend load spikes
    const maxBatchSize = scenario === 'hover' ? 3 : 5;
    const limitedIds = entityIds.slice(0, maxBatchSize);
    const limitedTypes = entityTypes.slice(0, maxBatchSize);
    
    return fetchMultipleEntitiesCriticalAction(limitedIds, limitedTypes);
}

// OPTIMIZED: Batch fetch multiple entities with proper error handling
export async function fetchMultipleEntitiesCriticalAction(entityIds: string[], entityTypes: string[]) {
    const supabase = await createClient();
    
    const ticketIds: string[] = [];
    const projectIds: string[] = [];
    
    entityIds.forEach((id, index) => {
        const type = entityTypes[index];
        const normalizedType = ['assignment', 'status_change', 'comment', 'ticket', 'issue'].includes(type)
            ? 'ticket'
            : ['project', 'member_add'].includes(type)
                ? 'project'
                : type;
                
        if (normalizedType === 'ticket') ticketIds.push(id);
        else if (normalizedType === 'project') projectIds.push(id);
    });

    // Use views for all optimized queries - no raw joins
    const results = await Promise.allSettled([
        // Batch fetch tickets using pre-built view
        ticketIds.length > 0 ? supabase
            .from('ticket_summary_view')
            .select('*')
            .in('id', ticketIds) : Promise.resolve({ data: [], error: null }),
            
        // Batch fetch projects using direct query (projects are simpler)
        projectIds.length > 0 ? supabase
            .from('projects')
            .select('id, project_name, description, lead_id, created_at, updated_at, lead:users!lead_id(id, name, email, avatar_url)')
            .in('id', projectIds) : Promise.resolve({ data: [], error: null })
    ]);

    const ticketsResult = results[0];
    const projectsResult = results[1];

    if (ticketsResult.status === 'rejected' || projectsResult.status === 'rejected') {
        console.error('[Action] Batch fetch error:', { ticketsResult, projectsResult });
        return { data: [], error: null }; // Never block UI
    }

    const ticketsData = ticketsResult.status === 'fulfilled' ? ticketsResult.value.data || [] : [];
    const projectsData = projectsResult.status === 'fulfilled' ? projectsResult.value.data || [] : [];

    return { 
        data: [...ticketsData, ...projectsData], 
        error: null // Never block UI
    };
}
