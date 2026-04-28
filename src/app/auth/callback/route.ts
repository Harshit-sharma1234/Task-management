import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { isSafeRedirectPath } from '@/lib/validation'
import { getRolePath } from '@/lib/role-utils'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/'

  // Issue #2: Validate redirect path to prevent open redirects
  const next = isSafeRedirectPath(rawNext) ? rawNext : '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const adminClient = createAdminClient()
        const isInviteRedirect = next.startsWith('/invite/')
        
        // 1. Get internal user profile
        const { data: userProfile } = await adminClient
          .from('users')
          .select('id, last_workspace_id')
          .eq('auth_id', user.id)
          .maybeSingle()

        // Issue #6: Sync OAuth profile data on every login
        if (userProfile) {
          const oauthName = user.user_metadata?.full_name || user.user_metadata?.name
          const oauthAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture

          if (oauthName || oauthAvatar) {
            const updates: Record<string, string> = {}
            if (oauthName) updates.name = oauthName
            if (oauthAvatar) updates.avatar_url = oauthAvatar

            await adminClient
              .from('users')
              .update(updates)
              .eq('id', userProfile.id)
          }
        }

        if (userProfile) {
          const lastWorkspaceId = (userProfile as any).last_workspace_id

          const { data: memberships } = await adminClient
            .from('workspace_members')
            .select('workspace_id, role_id, workspaces(slug), roles(role_name)')
            .eq('user_id', userProfile.id)

          if (memberships && memberships.length > 0) {
            if (isInviteRedirect) {
              return NextResponse.redirect(`${origin}${next}`)
            }

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
          
          return NextResponse.redirect(`${origin}/workspace`)
        }

        // Issue #14: Profile missing after OAuth — attempt repair before redirecting
        console.warn(`[auth/callback] No profile found for auth user ${user.id}. DB trigger may have failed.`)
        
        // Attempt auto-repair using OAuth metadata
        const fallbackName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'
        const fallbackAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null
        const fallbackEmployeeId = `EXT-${user.id.slice(0, 8).toUpperCase()}`

        await adminClient
          .from('users')
          .upsert({
            id: user.id,
            auth_id: user.id,
            email: (user.email || '').toLowerCase(),
            name: fallbackName,
            avatar_url: fallbackAvatar,
            employee_id: fallbackEmployeeId,
          }, { onConflict: 'id' })

        // After repair, redirect to workspace onboarding (no memberships yet)
        if (isInviteRedirect) {
          return NextResponse.redirect(`${origin}${next}`)
        }
        return NextResponse.redirect(`${origin}/workspace`)
      }
      
      // User is null after exchange — shouldn't happen, fallback
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Auth failed
  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`)
}
