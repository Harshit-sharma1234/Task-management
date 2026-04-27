import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  // Robust origin detection for production (handles proxies like Vercel)
  const protocol = request.headers.get('x-forwarded-proto') || requestUrl.protocol.replace(':', '') || 'http'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || requestUrl.host
  const origin = `${protocol.includes('://') ? protocol : `${protocol}://`}${host}`

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const adminClient = createAdminClient()
        const isInviteRedirect = next.startsWith('/invite/')
        
        // Add a small delay to ensure the DB trigger (social_auth_sync.sql) has finished
        // especially in high-latency production environments.
        await new Promise(resolve => setTimeout(resolve, 500))

        // 1. Get internal user profile
        let { data: userProfile } = await adminClient
          .from('users')
          .select('id, last_workspace_id')
          .eq('auth_id', user.id)
          .maybeSingle()

        if (!userProfile) {
          // If still not found, try one more time after another brief wait
          await new Promise(resolve => setTimeout(resolve, 1000))
          const { data: retryProfile } = await adminClient
            .from('users')
            .select('id, last_workspace_id')
            .eq('auth_id', user.id)
            .maybeSingle()
          
          if (!retryProfile) {
            console.error('Auth Callback: User record not found in public.users table after signup/login.')
            await supabase.auth.signOut()
            return NextResponse.redirect(`${origin}/login?message=No account found for this email. Please sign up with your work email first.`)
          }
          userProfile = retryProfile
        }

        // Handle invited users first
        if (isInviteRedirect) {
          return NextResponse.redirect(`${origin}${next}`)
        }

        return handleAuthenticatedUser(userProfile, adminClient, origin)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`)
}

async function handleAuthenticatedUser(userProfile: any, adminClient: any, origin: string) {
  // 2. Refresh last visited workspace
  const lastWorkspaceId = userProfile.last_workspace_id

  // 3. Get memberships
  const { data: memberships } = await adminClient
    .from('workspace_members')
    .select('workspace_id, role_id, workspaces(slug), roles(role_name)')
    .eq('user_id', userProfile.id)

  if (memberships && memberships.length > 0) {
    // Determine target workspace
    let target = memberships[0]
    if (lastWorkspaceId) {
      const matched = memberships.find((m: any) => m.workspace_id === lastWorkspaceId)
      if (matched) target = matched
    }

    const slug = (target as any).workspaces?.slug
    const roleName = (target as any).roles?.role_name || 'Junior Developer'
    const rolePath = getRolePath(roleName)

    return NextResponse.redirect(`${origin}/dashboard/${slug}/${rolePath}`)
  }
  
  // No memberships yet, send to set-password (so they can set a password for email login)
  return NextResponse.redirect(`${origin}/auth/set-password`)
}

function getRolePath(roleName: string): string {
  switch (roleName) {
    case 'Admin': return 'admin'
    case 'Project Manager': return 'project-manager'
    case 'Senior Developer': return 'senior-developer'
    case 'Junior Developer': return 'junior-developer'
    default: return 'junior-developer'
  }
}
