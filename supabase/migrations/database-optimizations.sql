-- Database Optimizations for Entity Detail Performance
-- This file contains indexes and views to optimize the inbox performance

-- 1. CRITICAL INDEXES for Entity Detail queries

-- Tickets table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_id_project ON tickets(id, project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_assignee_status ON tickets(assignee_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_created_by_project ON tickets(created_by, project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_updated_at ON tickets(updated_at DESC);

-- Comments table indexes  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_ticket_created ON comments(ticket_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_user_ticket ON comments(user_id, ticket_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Logs table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_logs_ticket_created ON logs(ticket_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_logs_user_ticket ON logs(user_id, ticket_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);

-- Notifications table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_entity ON notifications(entity_id, entity_type);

-- Projects table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_lead ON projects(lead_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Users table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);

-- 2. VIEWS for commonly accessed data

-- Ticket Summary View (optimized for critical data)
CREATE OR REPLACE VIEW ticket_summary_view AS
SELECT 
    t.id,
    t.title,
    t.status,
    t.priority,
    t.project_id,
    t.created_by,
    t.assignee_id,
    t.reviewer_id,
    t.due_date,
    t.created_at,
    t.updated_at,
    p.project_name,
    cb.name as created_by_name,
    cb.avatar_url as created_by_avatar,
    at.name as assignee_name,
    at.avatar_url as assignee_avatar
FROM public.tickets t
LEFT JOIN public.projects p ON t.project_id = p.id
LEFT JOIN public.users cb ON t.created_by = cb.id
LEFT JOIN public.users at ON t.assignee_id = at.id;

-- Activity Feed View (optimized + cleaner)
CREATE OR REPLACE VIEW ticket_activity_view AS
-- Comments
SELECT 
    'comment' as activity_type,
    c.id,
    c.ticket_id,
    c.created_at,
    c.comment,
    u.name as user_name,
    u.avatar_url as user_avatar,
    u.id as user_id
FROM public.comments c
JOIN public.users u ON c.user_id = u.id

UNION ALL

-- Logs
SELECT 
    CASE 
        WHEN l.field = 'status' THEN 'log'
        WHEN l.field = 'priority' THEN 'log'
        WHEN l.field = 'assignee_id' THEN 'log'
        ELSE 'log'
    END as activity_type,
    l.id,
    l.ticket_id,
    l.created_at,
    CASE 
        WHEN l.field = 'status' THEN CONCAT('Status changed from ', l.old_value, ' to ', l.new_value)
        WHEN l.field = 'priority' THEN CONCAT('Priority changed from ', l.old_value, ' to ', l.new_value)
        WHEN l.field = 'assignee_id' THEN CONCAT('Assigned to ', COALESCE(u_new.name, 'Unassigned'))
        ELSE CONCAT(l.field, ' updated')
    END as comment,
    u.name as user_name,
    u.avatar_url as user_avatar,
    u.id as user_id
FROM public.logs l
JOIN public.users u ON l.user_id = u.id
LEFT JOIN public.users u_new ON l.new_value::uuid = u_new.id;

-- 3. PARTIAL INDEXES for common query patterns

-- Unread notifications (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread_partial 
ON notifications(user_id, created_at DESC) 
WHERE is_read = false;

-- Active tickets by assignee
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_active_assignee 
ON tickets(assignee_id, updated_at DESC) 
WHERE status IN ('open', 'in_progress');

-- Recent comments (last 30 days)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_recent 
ON comments(ticket_id, created_at DESC) 
WHERE created_at > NOW() - INTERVAL '30 days';

-- 4. PERFORMANCE ANALYSIS QUERIES

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
ORDER BY idx_scan DESC;

-- Check slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query LIKE '%tickets%' 
   OR query LIKE '%comments%' 
   OR query LIKE '%logs%'
ORDER BY mean_time DESC 
LIMIT 10;

-- 5. MAINTENANCE COMMANDS

-- Update table statistics (run after major data changes)
ANALYZE public.tickets;
ANALYZE public.comments;
ANALYZE public.logs;
ANALYZE public.notifications;
ANALYZE public.projects;
ANALYZE public.users;

-- Rebuild indexes if fragmented (run during maintenance window)
-- REINDEX INDEX CONCURRENTLY idx_tickets_id_project;

-- 6. MONITORING QUERIES

-- Monitor cache hit ratio
SELECT 
    datname,
    blks_hit,
    blks_read,
    round(blks_hit::numeric / (blks_hit + blks_read) * 100, 2) as cache_hit_ratio
FROM pg_stat_database 
WHERE datname = current_database();

-- Monitor table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 7. CLEANUP COMMANDS

-- Remove unused indexes (check first)
-- DROP INDEX CONCURRENTLY IF EXISTS idx_unused_index;

-- Vacuum analyze for performance (run weekly)
VACUUM ANALYZE public.tickets;
VACUUM ANALYZE public.comments;
VACUUM ANALYZE public.logs;
VACUUM ANALYZE public.notifications;
