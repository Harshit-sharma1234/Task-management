'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRolePath } from '@/lib/role-utils'
import { isSafeRedirectPath } from '@/lib/validation'

export async function login(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const credentials = {
    email: (formData.get('email') as string).trim().toLowerCase(),
    password: formData.get('password') as string,
  }

  // Issue #10: Read the next URL from the form
  const nextUrl = formData.get('next') as string | null

  // 1. Authenticate
  const authResponse = await Promise.race([
    supabase.auth.signInWithPassword(credentials),
    new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Auth Timeout')), 15000))
  ]).catch(() => ({ data: { user: null }, error: { message: 'Auth service timed out. Please check your connection or Supabase status.' } }));
  
  const { data: { user }, error } = authResponse;

  if (error) {
    return { error: 'Could not authenticate user: ' + error.message }
  }

  // 2. Get internal user profile
  const adminClient = createAdminClient();
  const { data: userProfile } = await adminClient
    .from('users')
    .select('id')
    .eq('email', credentials.email)
    .maybeSingle();

  if (!userProfile) {
    await supabase.auth.signOut()
    return { error: 'No profile found for this email. Please sign up.' }
  }

  // Issue #10: If there's a valid next URL (e.g. invite link), redirect there
  if (nextUrl && isSafeRedirectPath(nextUrl)) {
    revalidatePath('/', 'layout')
    return redirect(nextUrl)
  }

  // Try to get last_workspace_id (may not exist if migration hasn't run)
  let lastWorkspaceId: string | null = null;
  try {
    const { data: lwData } = await adminClient
      .from('users')
      .select('last_workspace_id')
      .eq('id', userProfile.id)
      .single();
    lastWorkspaceId = lwData?.last_workspace_id || null;
  } catch { /* column may not exist yet */ }

  // 3. Get workspace memberships
  const { data: memberships } = await adminClient
    .from('workspace_members')
    .select('workspace_id, role_id, workspaces(slug)')
    .eq('user_id', userProfile.id);

  // 4. If no memberships, send to workspace onboarding
  if (!memberships || memberships.length === 0) {
    revalidatePath('/', 'layout')
    return redirect('/workspace')
  }

  // 5. Determine target workspace (prefer last_workspace_id)
  let targetMembership = memberships[0];

  if (lastWorkspaceId) {
    const lastVisited = memberships.find(
      (m: any) => m.workspace_id === lastWorkspaceId
    );
    if (lastVisited) targetMembership = lastVisited;
  }

  // 6. Get role name for routing
  const { data: role } = await adminClient
    .from('roles')
    .select('role_name')
    .eq('id', targetMembership.role_id)
    .single();

  const workspaceSlug = (targetMembership as any).workspaces?.slug || 'default';
  const rolePath = getRolePath(role?.role_name || 'Junior Developer');

  revalidatePath('/', 'layout')
  return redirect(`/dashboard/${workspaceSlug}/${rolePath}`)
}
