import { cache } from 'react';
import { createClient } from './supabase/server';

/**
 * Deduplicated Auth User Fetch
 * Uses React.cache to ensure only one network request per server render.
 */
export const getServerUser = cache(async () => {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) return null;
    return user;
});
