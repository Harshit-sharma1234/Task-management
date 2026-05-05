import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { createAdminClient } from './supabase/admin';

/**
 * Cached fetch for the users belonging to a specific workspace.
 */
/**
 * Cached fetch for a specific workspace member (useful for permission checks).
 */
export async function getCachedWorkspaceMember(workspaceId: string, userId: string) {
  return unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          users(id, name, avatar_url),
          roles(role_name)
        `)
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) return null;
      return {
        ...data.users,
        roles: Array.isArray(data.roles) ? data.roles[0] : data.roles
      };
    },
    [`workspace-member-${workspaceId}-${userId}`],
    {
      revalidate: 3600,
      tags: [`workspace-${workspaceId}`, `user-${userId}`]
    }
  )();
}

/**
 * Cached fetch for the users belonging to a specific workspace.
 */
export const getCachedUsers = (workspaceId: string) => cache(unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('workspace_members')
      .select(`
        users(id, auth_id, email, name, employee_id, avatar_url),
        roles(role_name)
      `)
      .eq('workspace_id', workspaceId);

    if (error) {
      console.error(`[Cache] Database error fetching user list for workspace ${workspaceId}: ${error.message}`);
      return [];
    }
    return (data || []).map((m: any) => ({
      ...m.users,
      roles: Array.isArray(m.roles) ? m.roles[0] : m.roles
    })).filter(u => u.id);
  },
  ['workspace-members-list', workspaceId],
  {
    revalidate: 3600,
    tags: [`team-members-${workspaceId}`, 'team-members', 'users', `workspace-${workspaceId}`]
  }
))();

/**
 * Cached fetch for workspace-specific dashboard statistics (counts).
 */
export const getCachedStats = (workspaceId: string) => cache(unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const [projectsRes, ticketsRes] = await Promise.all([
      supabase.from('projects')
        .select('id, project_name, description, created_at, status')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false }),
      supabase.from('tickets')
        .select('id, project_id, status, priority')
        .eq('workspace_id', workspaceId)
    ]);

    const projects = projectsRes.data || [];
    const tickets = ticketsRes.data || [];

    const projectsCount = projects.length;
    const completedProjectsCount = projects.filter(p => p.status === 'done').length;
    const inProgressProjectsCount = projects.filter(p => p.status === 'in_progress').length;
    const recentProjects = projects.slice(0, 3);

    const tasksCount = tickets.length;
    const urgentIssuesCount = tickets.filter(t => t.priority === 'urgent' && t.status !== 'done').length;

    // Calculate progress stats for projects
    const projectStats: Record<string, { total: number, done: number }> = {};
    tickets.forEach(ticket => {
      if (!ticket.project_id) return;
      if (!projectStats[ticket.project_id]) {
        projectStats[ticket.project_id] = { total: 0, done: 0 };
      }
      projectStats[ticket.project_id].total++;
      if (ticket.status === 'done') {
        projectStats[ticket.project_id].done++;
      }
    });

    return {
      projectsCount,
      tasksCount,
      recentProjects,
      completedProjectsCount,
      inProgressProjectsCount,
      urgentIssuesCount,
      projectStats
    };
  },
  ['dashboard-stats-counts-v3', workspaceId],
  {
    revalidate: 60,
    tags: ['dashboard-stats', 'projects', 'tickets', `workspace-${workspaceId}`]
  }
))();

/**
 * Cached fetch for global dashboard statistics (counts), specific to a user AND a workspace.
 */
export const getCachedUserStatsV2 = (userId: string, workspaceId: string) =>
  unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const [
        urgentTicketsRes,
        completedTicketsRes,
        inProgressTicketsRes,
        allTicketsRes,
        leadProjectsRes,
        memberProjectsRes
      ] = await Promise.all([
        supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).or(`assignee_id.eq.${userId},reviewer_id.eq.${userId}`).eq('priority', 'urgent').neq('status', 'done'),
        supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).or(`assignee_id.eq.${userId},reviewer_id.eq.${userId}`).eq('status', 'done'),
        supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).or(`assignee_id.eq.${userId},reviewer_id.eq.${userId}`).in('status', ['in_progress', 'in_review']),
        supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).or(`assignee_id.eq.${userId},reviewer_id.eq.${userId}`),
        supabase.from('projects').select('id').eq('workspace_id', workspaceId).eq('lead_id', userId),
        supabase.from('project_members').select('project_id, projects!inner(workspace_id)').eq('user_id', userId).eq('projects.workspace_id', workspaceId)
      ]);

      const leadIds = leadProjectsRes.data?.map(p => p.id) || [];
      // Removed memberProjectsRes inclusion as per user feedback about 'unassigned' leads/members
      const uniqueProjectIds = new Set(leadIds);

      return {
        urgentIssuesCount: urgentTicketsRes.count || 0,
        completedTicketsCount: completedTicketsRes.count || 0,
        inProgressTicketsCount: inProgressTicketsRes.count || 0,
        tasksCount: allTicketsRes.count || 0,
        projectsAssignedCount: uniqueProjectIds.size
      };
    },
    [`dashboard-user-stats-${userId}-${workspaceId}`],
    {
      revalidate: 60,
      tags: ['dashboard-stats', 'projects', 'tickets', `user-tasks-${userId}`, `workspace-${workspaceId}`]
    }
  )();

/**
 * Cached fetch for a specific workspace by its slug.
 */
export const getCachedWorkspaceBySlug = (slug: string) =>
  unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name, slug')
        .eq('slug', slug)
        .maybeSingle();

      if (error) {
        console.error(`[Cache] Error fetching workspace by slug ${slug}:`, error);
        return null;
      }
      return data;
    },
    [`workspace-by-slug-${slug}`],
    {
      revalidate: 3600,
      tags: [`workspace-slug-${slug}`]
    }
  )();

/**
 * Cached fetch for a specific user's profile.
 * NOTE: No longer joins roles — role is determined per-workspace via workspace_members.
 */
export const getCachedUserProfile = (email: string) =>
  unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('users')
        .select('id, auth_id, email, name, employee_id, avatar_url')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        console.error(`[Cache] Database error fetching profile for ${email}: ${error.message}`, {
          code: error.code,
          hint: error.hint,
          details: error.details
        });
        return null;
      }
      return data;
    },
    [`user-profile-${email}`],
    {
      revalidate: 3600,
      tags: [`user-profile-${email}`]
    }
  )();

/**
 * Cached fetch for recent tickets in a specific workspace.
 */
export const getCachedRecentTickets = (limit: number = 10, workspaceId: string) =>
  unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('tickets')
        .select('id, title, status, priority, created_at, assignee_id, reviewer_id, projects(project_name), assignees:users!assignee_id(id, name, avatar_url)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error(`[Cache] Error fetching recent tickets for workspace ${workspaceId}:`, error);
        return [];
      }
      return data || [];
    },
    [`recent-tickets-${limit}-${workspaceId}`],
    {
      revalidate: 60,
      tags: ['tickets', `workspace-${workspaceId}`]
    }
  )();

/**
 * Cached fetch for a specific user's unread notification count.
 */
export const getCachedUnreadCount = (userId: string, workspaceId: string) =>
  unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'estimated', head: true })
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId)
        .eq('is_read', false);

      if (error) {
        console.error(`[Cache] Error fetching unread count for ${userId} in workspace ${workspaceId}:`, error);
        return 0;
      }
      return count || 0;
    },
    [`unread-notifications-${userId}-${workspaceId}`],
    {
      revalidate: 600,
      tags: [`notifications-${userId}`, `workspace-${workspaceId}`]
    }
  )();

/**
 * Cached fetch for all projects in a specific workspace.
 */
export const getCachedProjects = (workspaceId: string) => cache(unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('projects')
      .select('id, project_name, description, status, priority, lead_id, start_date, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[Cache] Error fetching projects for workspace ${workspaceId}:`, error);
      return [];
    }
    return data || [];
  },
  ['projects-list', workspaceId],
  {
    revalidate: 60,
    tags: ['projects', `workspace-${workspaceId}`]
  }
))();

/**
 * Cached fetch for Issue page project dropdown (lightweight), specific to workspace.
 */
export const getCachedIssueProjects = (workspaceId: string) => unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('projects')
      .select('id, project_name')
      .eq('workspace_id', workspaceId)
      .order('project_name');

    if (error) {
      console.error(`[Cache] Error fetching issue projects for workspace ${workspaceId}:`, error);
      return [];
    }
    return data || [];
  },
  ['issue-projects-list', workspaceId],
  {
    revalidate: 300, // 5 min
    tags: ['projects', `workspace-${workspaceId}`],
  }
)();

/**
 * Cached fetch for Issue page user dropdown (lightweight), specific to workspace.
 */
export const getCachedIssueUsers = (workspaceId: string) => unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('workspace_members')
      .select(`
        users(id, name, avatar_url, email),
        roles(role_name)
      `)
      .eq('workspace_id', workspaceId);

    if (error) {
      console.error(`[Cache] Error fetching issue users for workspace ${workspaceId}:`, error);
      return [];
    }
    return (data || []).map((m: any) => ({
      ...m.users,
      roles: Array.isArray(m.roles) ? m.roles[0] : m.roles
    })).filter(u => u.id);
  },
  ['issue-users-list', workspaceId],
  {
    revalidate: 300, // 5 min
    tags: ['team-members', 'users', `workspace-${workspaceId}`],
  }
)();

/**
 * Super lightweight fetch for user dropdowns to minimize payload size, scoped to workspace.
 */
export const getCachedUsersMinimal = (workspaceId: string) => unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('workspace_members')
      .select('users(id, name)')
      .eq('workspace_id', workspaceId);

    if (error) {
      console.error(`[Cache] Error fetching minimal users for workspace ${workspaceId}:`, error);
      return [];
    }
    return (data || []).map((m: any) => m.users).filter(Boolean).sort((a: any, b: any) => a.name.localeCompare(b.name));
  },
  ['users-minimal-list', workspaceId],
  {
    revalidate: 600,
    tags: ['team-members', 'users', `workspace-${workspaceId}`],
  }
)();

/**
 * Cached fetch for users relevant to a single project page.
 * Includes project lead, project members, and ticket assignees/reviewers.
 */
export const getCachedProjectUsers = (projectId: string) =>
  unstable_cache(
    async () => {
      const supabase = createAdminClient();

      const [projectRes, membersRes, ticketsRes] = await Promise.all([
        supabase.from('projects').select('lead_id').eq('id', projectId).maybeSingle(),
        supabase.from('project_members').select('user_id').eq('project_id', projectId),
        supabase.from('tickets').select('assignee_id, reviewer_id').eq('project_id', projectId),
      ]);

      const candidateIds = new Set<string>();

      if (projectRes.data?.lead_id) candidateIds.add(projectRes.data.lead_id);
      (membersRes.data || []).forEach((m: any) => {
        if (m.user_id) candidateIds.add(m.user_id);
      });
      (ticketsRes.data || []).forEach((t: any) => {
        if (t.assignee_id) candidateIds.add(t.assignee_id);
        if (t.reviewer_id) candidateIds.add(t.reviewer_id);
      });

      const userIds = Array.from(candidateIds);
      if (userIds.length === 0) return [];

      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, avatar_url, roles(role_name)')
        .in('id', userIds)
        .order('name');

      if (error) {
        console.error(`[Cache] Error fetching project-scoped users for ${projectId}:`, error);
        return [];
      }

      return data || [];
    },
    ['project-users-list', projectId],
    {
      revalidate: 120,
      tags: ['projects', 'issues', 'project-members', `project:${projectId}`],
    }
  )();

/**
 * Cached fetch for Issues list page (workspace-scoped).
 */
export const getCachedIssuesList = (workspaceId: string, limit: number = 120) =>
  unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('tickets')
        .select('id, title, status, priority, assignee_id, reviewer_id, created_at, projects(id, project_name), assignees:users!assignee_id(id, name, avatar_url)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error(`[Cache] Error fetching issues list for workspace ${workspaceId}:`, error);
        return [];
      }
      return data || [];
    },
    ['issues-list', workspaceId, String(limit)],
    {
      revalidate: 60,
      tags: ['issues', 'projects', 'team-members', `workspace-${workspaceId}`],
    }
  )();

/**
 * Cached fetch for tickets assigned to or reviewed by a specific user, scoped to workspace.
 */
export const getCachedUserTasks = (userId: string, workspaceId: string) =>
  unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('tickets')
        .select('id, title, status, priority, created_at, assignee_id, reviewer_id, projects(project_name)')
        .eq('workspace_id', workspaceId)
        .or(`assignee_id.eq.${userId},reviewer_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`[Cache] Error fetching user tasks for user ${userId} in workspace ${workspaceId}:`, error);
        return [];
      }
      return data || [];
    },
    [`user-tasks-${userId}-${workspaceId}`],
    {
      revalidate: 60,
      tags: ['tickets', `user-tasks-${userId}`, `workspace-${workspaceId}`]
    }
  )();

/**
 * Cached fetch for My Tasks page with full detail relations, scoped to workspace.
 */
export const getCachedMyTasksDetailed = (userId: string, workspaceId: string) =>
  unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const [ticketsRes, projectsRes, usersRes] = await Promise.all([
        supabase
          .from('tickets')
          .select(`
            id, 
            title, 
            status, 
            priority, 
            assignee_id, 
            reviewer_id, 
            created_by, 
            created_at, 
            attachments, 
            projects(id, project_name), 
            assignees:users!assignee_id(id, name, avatar_url),
            reviewers:users!reviewer_id(id, name, avatar_url)
          `)
          .eq('workspace_id', workspaceId)
          .or(`assignee_id.eq.${userId},reviewer_id.eq.${userId}`)
          .order('created_at', { ascending: false }),
        supabase.from('projects')
          .select('id, project_name')
          .eq('workspace_id', workspaceId)
          .order('project_name'),
        supabase.from('workspace_members')
          .select('users(id, name, avatar_url)')
          .eq('workspace_id', workspaceId)
      ]);

      if (ticketsRes.error) {
        console.error(`[Cache] Error fetching detailed user tasks for ${userId} in workspace ${workspaceId}:`, ticketsRes.error);
      }

      const users = (usersRes.data || []).map((m: any) => m.users).filter(Boolean);

      return {
        tickets: ticketsRes.data || [],
        projects: (projectsRes.data || []).map(p => ({ id: p.id, name: p.project_name })),
        users: users
      };
    },
    [`my-tasks-full-${userId}-${workspaceId}`],
    {
      revalidate: 60,
      tags: ['tickets', 'projects', 'team-members', `user-tasks-${userId}`, `workspace-${workspaceId}`]
    }
  )();

/**
 * Cached fetch for upcoming deadlines (projects or tickets due within 30 days), scoped to workspace.
 */
export const getCachedUpcomingDeadlines = (workspaceId: string) => unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const inThirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Check for target_date in projects
    const { data: projects } = await supabase
      .from('projects')
      .select('id, project_name, target_date, status')
      .eq('workspace_id', workspaceId)
      .neq('status', 'done')
      .not('target_date', 'is', null)
      .gte('target_date', now)
      .lte('target_date', inThirtyDays)
      .order('target_date')
      .limit(5);

    return projects || [];
  },
  ['upcoming-deadlines-v3', workspaceId],
  {
    revalidate: 60,
    tags: ['projects', 'tickets', `workspace-${workspaceId}`]
  }
)();

/**
 * Cached fetch for recent unread notifications for a user within a workspace.
 */
export const getCachedRecentNotifications = (userId: string, workspaceId: string, limit: number = 3) =>
  unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('notifications')
        .select('id, message, created_at, type, is_read')
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error(`[Cache] Error fetching recent notifications for ${userId} in ${workspaceId}:`, error);
        return [];
      }
      return data || [];
    },
    [`recent-notifications-${userId}-${workspaceId}-${limit}`],
    {
      revalidate: 30,
      tags: [`notifications-${userId}`, `workspace-${workspaceId}`]
    }
  )();

/**
 * Cached fetch for a user's personal scratchpad.
 */
export const getCachedUserNote = (userId: string) =>
  unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from('user_notes')
        .select('content')
        .eq('user_id', userId)
        .maybeSingle();

      return data?.content || '';
    },
    [`user-note-${userId}`],
    {
      revalidate: 60,
      tags: [`user-note-${userId}`]
    }
  )();
