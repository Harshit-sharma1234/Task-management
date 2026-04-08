import { cache } from 'react';
import { createClient } from './supabase/server';
import { getCachedUserProfile } from './cache';

/**
 * Deduplicated Auth User Fetch
 * Uses React.cache to ensure that even if Layout and Page both call this,
 * only one network request is made during a single server render.
 */
export const getServerUser = cache(async () => {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) return null;
    return user;
});

/**
 * Deduplicated Profile Fetch
 * Keyed by email. Integrates with existing unstable_cache for cross-request caching,
 * while React.cache handles per-request deduplication.
 */
export const getServerProfile = cache(async (email: string) => {
    if (!email) return null;
    return await getCachedUserProfile(email);
});
