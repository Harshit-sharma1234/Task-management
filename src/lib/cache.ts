import { unstable_cache } from 'next/cache';
import { createAdminClient } from './supabase/admin';

/**
 * Cached fetch for the total list of team members.
 * Revalidates every hour or when 'team-members' tag is invalidated.
 */
export const getCachedUsers = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('users')
      .select('*, roles (role_name)')
      .order('name');
    
    if (error) {
      console.error('[Cache] Error fetching users:', error);
      return [];
    }
    return data || [];
  },
  ['team-members-list'],
  { 
    revalidate: 3600, // 1 hour
    tags: ['team-members'] 
  }
);

/**
 * Cached fetch for global dashboard statistics (counts).
 */
export const getCachedStats = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const [projectsRes, ticketsRes, recentProjectsRes, doneProjectsRes, inProgressProjectsRes] = await Promise.all([
      supabase.from('projects').select('*', { count: 'exact', head: true }),
      supabase.from('tickets').select('*', { count: 'exact', head: true }),
      supabase.from('projects').select('id, project_name, description, created_at, status').order('created_at', { ascending: false }).limit(3),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'done'),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'in_progress')
    ]);
    
    return {
      projectsCount: projectsRes.count || 0,
      tasksCount: ticketsRes.count || 0,
      recentProjects: recentProjectsRes.data || [],
      completedProjectsCount: doneProjectsRes.count || 0,
      inProgressProjectsCount: inProgressProjectsRes.count || 0
    };
  },
  ['dashboard-stats-counts'],
  { 
    revalidate: 60,  // Changed from 3600 to 60 to prevent stale overview data
    tags: ['dashboard-stats'] 
  }
);

/**
 * Cached fetch for a specific user's profile.
 * Keyed by email.
 */
export const getCachedUserProfile = (email: string) => 
  unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('users')
        .select('*, roles(role_name)')
        .eq('email', email)
        .maybeSingle(); // Better than .single() for caching potential nulls
      
      if (error) {
        console.error(`[Cache] Error fetching profile for ${email}:`, error);
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
 * Cached fetch for recent tickets.
 */
export const getCachedRecentTickets = (limit: number = 10) =>
  unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('tickets')
        .select('id, title, status, priority, created_at, assignee_id, reviewer_id, projects(project_name)')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('[Cache] Error fetching recent tickets:', error);
        return [];
      }
      return data || [];
    },
    [`recent-tickets-${limit}`],
    {
      revalidate: 60, // Changed from 3600 to keep UI fresh
      tags: ['tickets']
    }
  )();

/**
 * Cached fetch for a specific user's unread notification count.
 */
export const getCachedUnreadCount = (userId: string) =>
  unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false); // Note: check column name, usually is_read or read
      
      if (error) {
        console.error(`[Cache] Error fetching unread count for ${userId}:`, error);
        return 0;
      }
      return count || 0;
    },
    [`unread-notifications-${userId}`],
    { 
      revalidate: 60, 
      tags: [`notifications-${userId}`] 
    }
  )();

/**
 * Cached fetch for all projects with specific columns.
 */
export const getCachedProjects = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('projects')
      .select('id, project_name, description, status, priority, lead_id, start_date, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[Cache] Error fetching projects:', error);
      return [];
    }
    return data || [];
  },
  ['projects-list'],
  { 
    revalidate: 60,
    tags: ['projects'] 
  }
);

/**
 * Cached fetch for Issue page project dropdown (lightweight).
 */
export const getCachedIssueProjects = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('projects')
      .select('id, project_name')
      .order('project_name');

    if (error) {
      console.error('[Cache] Error fetching issue projects:', error);
      return [];
    }
    return data || [];
  },
  ['issue-projects-list'],
  {
    revalidate: 300, // 5 min
    tags: ['projects'],
  }
);

/**
 * Cached fetch for Issue page user dropdown (lightweight).
 */
export const getCachedIssueUsers = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('users')
      .select('id, name, avatar_url, roles(role_name)')
      .order('name');

    if (error) {
      console.error('[Cache] Error fetching issue users:', error);
      return [];
    }
    return data || [];
  },
  ['issue-users-list'],
  {
    revalidate: 300, // 5 min
    tags: ['team-members'],
  }
);

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
 * Cached fetch for Issues list page (global list).
 * Keeps repeat visits fast while realtime/mutations revalidate tags.
 */
export const getCachedIssuesList = (limit: number = 120) =>
  unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('tickets')
        .select('id, title, status, priority, assignee_id, reviewer_id, created_at, projects(id, project_name), assignees:users!assignee_id(id, name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[Cache] Error fetching issues list:', error);
        return [];
      }
      return data || [];
    },
    ['issues-list', String(limit)],
    {
      revalidate: 30,
      tags: ['issues', 'projects', 'team-members'],
    }
  )();

/**
 * Cached fetch for tickets assigned to or reviewed by a specific user.
 */
export const getCachedUserTasks = (userId: string) =>
  unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('tickets')
        .select('id, title, status, priority, created_at, assignee_id, reviewer_id, projects(project_name)')
        .or(`assignee_id.eq.${userId},reviewer_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error(`[Cache] Error fetching user tasks for ${userId}:`, error);
        return [];
      }
      return data || [];
    },
    [`user-tasks-${userId}`],
    {
      revalidate: 60,
      tags: ['tickets', `user-tasks-${userId}`]
    }
  )();

/**
 * Cached fetch for My Tasks page with full detail relations.
 */
export const getCachedMyTasksDetailed = (userId: string) =>
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
          .or(`assignee_id.eq.${userId},reviewer_id.eq.${userId}`)
          .order('created_at', { ascending: false }),
        supabase.from('projects').select('id, project_name').order('project_name'),
        supabase.from('users').select('id, name, avatar_url, roles(role_name)').order('name')
      ]);
      
      if (ticketsRes.error) {
        console.error(`[Cache] Error fetching detailed user tasks for ${userId}:`, ticketsRes.error);
      }
      
      return {
        tickets: ticketsRes.data || [],
        projects: (projectsRes.data || []).map(p => ({ id: p.id, name: p.project_name })),
        users: usersRes.data || []
      };
    },
    [`my-tasks-full-${userId}`],
    {
      revalidate: 60,
      tags: ['tickets', 'projects', 'team-members', `user-tasks-${userId}`]
    }
  )();

