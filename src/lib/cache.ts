import { unstable_cache } from 'next/cache';
import { createAdminClient } from './supabase/admin';

/**
 * Cached fetch for the total list of team members.
 * Revalidates every hour or when 'team-members' tag is invalidated.
 */
export const getCachedUsers = unstable_cache(
  async () => {
    console.log('[Cache] Fetching fresh users list...');
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
    console.log('[Cache] Fetching fresh dashboard stats...');
    const supabase = createAdminClient();
    const [projectsRes, tasksRes] = await Promise.all([
      supabase.from('projects').select('*', { count: 'exact', head: true }),
      supabase.from('tasks').select('*', { count: 'exact', head: true })
    ]);
    
    return {
      projectsCount: projectsRes.count || 0,
      tasksCount: tasksRes.count || 0
    };
  },
  ['dashboard-stats-counts'],
  { 
    revalidate: 3600, 
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
      console.log(`[Cache] Fetching fresh profile for: ${email}`);
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
