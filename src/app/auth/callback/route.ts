import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // next is the path to redirect to after logging in (usually '/')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const adminClient = createAdminClient()
        const isInviteRedirect = next.startsWith('/invite/')
        
        // 1. Get internal user profile (already synced by trigger)
        const { data: userProfile } = await adminClient
          .from('users')
          .select('id, last_workspace_id')
          .eq('auth_id', user.id)
          .maybeSingle()

        if (userProfile) {
          // 2. Refresh last visited workspace
          const lastWorkspaceId = (userProfile as any).last_workspace_id

          // 3. Get memberships
          const { data: memberships } = await adminClient
            .from('workspace_members')
            .select('workspace_id, role_id, workspaces(slug), roles(role_name)')
            .eq('user_id', userProfile.id)

          if (memberships && memberships.length > 0) {
            if (isInviteRedirect) {
              return NextResponse.redirect(`${origin}${next}`)
            }

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
          
          // No memberships yet, send to onboarding
          return NextResponse.redirect(`${origin}/workspace`)
        }
      }
      
      const forwardedHost = request.headers.get('x-forwarded-host') 
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`)
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
