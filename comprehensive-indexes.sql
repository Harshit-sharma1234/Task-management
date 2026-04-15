-- ============================================================
-- COMPREHENSIVE DATABASE INDEXING STRATEGY
-- 
-- This script adds essential indexes across all major tables to 
-- ensure sub-200ms latency for dashboards and detail views.
-- 
-- Tables covered: tickets, projects, users, comments, logs, 
--                 notifications, project_members, project_resources.
-- ============================================================

-- 1. TICKETS (High-frequency filters & sorts)
-- ------------------------------------------------------------

-- Project-scoped issue listing (List/Board view)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_project_created_at 
ON public.tickets (project_id, created_at DESC);

-- My Tasks/User Stats (Assignee & Reviewer paths)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_assignee_status 
ON public.tickets (assignee_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_reviewer_status 
ON public.tickets (reviewer_id, status);

-- Project Progress (Total vs Done count efficiency)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_project_status 
ON public.tickets (project_id, status);

-- Dashboard Global Stats (Urgent Issues)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_priority_status_urgent 
ON public.tickets (priority, status) 
WHERE priority = 'urgent' AND status != 'done';


-- 2. PROJECTS (Dashboard & Deadlines)
-- ------------------------------------------------------------

-- Dashboard "Recent Projects" and "Project Overview"
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_status_created 
ON public.projects (status, created_at DESC);

-- Upcoming Deadlines widget
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_active_target_date 
ON public.projects (target_date) 
WHERE status != 'done' AND target_date IS NOT NULL;

-- Lead lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_lead_id 
ON public.projects (lead_id);


-- 3. PROJECT MEMBERS & RESOURCES
-- ------------------------------------------------------------

-- Project Members (Commonly used in RBAC check)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_members_compound 
ON public.project_members (project_id, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_members_user_id 
ON public.project_members (user_id);

-- Project Resources (Overview tab)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_resources_project_created 
ON public.project_resources (project_id, created_at DESC);


-- 4. ACTIVITY & COLLABORATION (Comments, Logs, Notifications)
-- ------------------------------------------------------------

-- Activity Feed (Unified stream)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_ticket_created 
ON public.comments (ticket_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_logs_ticket_created_detail 
ON public.logs (ticket_id, created_at DESC);

-- Notifications (Optimized unread polling)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications (user_id, created_at DESC) 
WHERE is_read = false;

-- Personal Lookup (Scratchpad)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_notes_user_id 
ON public.user_notes (user_id);


-- 5. PERFORMANCE MONITORING (Helpful queries)
-- ------------------------------------------------------------

-- List unused indexes for cleanup
-- SELECT 
--     relname AS table_name, 
--     indexrelname AS index_name, 
--     idx_scan AS times_used 
-- FROM pg_stat_user_indexes 
-- WHERE idx_scan = 0 AND schemaname = 'public';

-- ANALYZE all primary tables to refresh statistics
ANALYZE public.tickets;
ANALYZE public.projects;
ANALYZE public.users;
ANALYZE public.comments;
ANALYZE public.logs;
ANALYZE public.notifications;
ANALYZE public.project_members;
 