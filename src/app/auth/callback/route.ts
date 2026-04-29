import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { isSafeRedirectPath } from '@/lib/validation'
import { getRolePath } from '@/lib/role-utils'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token = requestUrl.searchParams.get('token')
  const rawNext = requestUrl.searchParams.get('next') ?? '/'

  // Robust origin detection for production (handles proxies like Vercel)
  const protocol = request.headers.get('x-forwarded-proto') || requestUrl.protocol.replace(':', '') || 'http'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || requestUrl.host
  const origin = `${protocol.includes('://') ? protocol : `${protocol}://`}${host}`

  // Issue #2: Validate redirect path to prevent open redirects
  const next = isSafeRedirectPath(rawNext) ? rawNext : '/'

  if (code) {
    console.log(`[auth/callback] Exchanging code for session... (Origin: ${origin})`)
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('[auth/callback] Exchange error:', exchangeError.message)
      return NextResponse.redirect(`${origin}/login?error=auth-exchange-failed&message=${encodeURIComponent(exchangeError.message)}`)
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('[auth/callback] User retrieval error:', userError?.message || 'No user found')
      return NextResponse.redirect(`${origin}/login?error=user-retrieval-failed`)
    }

    console.log(`[auth/callback] Authenticated user: ${user.id} (${user.email})`)
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
          
          if (retryProfile) {
            userProfile = retryProfile
          }
        }

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
            if (isInviteRedirect || token) {
              // Handle Invite Token for existing users
              if (token) {
                const { data: invite } = await adminClient
                  .from('workspace_invites')
                  .select('*, workspaces(name, slug), roles(role_name)')
                  .eq('token', token)
                  .eq('status', 'pending')
                  .gt('expires_at', new Date().toISOString())
                  .maybeSingle()

                if (invite && invite.email.toLowerCase() === user.email?.toLowerCase()) {
                  // Join workspace (if not already a member)
                  const { data: existing } = await adminClient
                    .from('workspace_members')
                    .select('id')
                    .eq('workspace_id', invite.workspace_id)
                    .eq('user_id', user.id)
                    .maybeSingle()

                  if (!existing) {
                    await adminClient
                      .from('workspace_members')
                      .insert({
                        workspace_id: invite.workspace_id,
                        user_id: user.id,
                        role_id: invite.role_id,
                        joined_at: new Date().toISOString(),
                      })

                    await adminClient
                      .from('workspace_invites')
                      .update({ 
                        status: 'accepted', 
                        accepted_at: new Date().toISOString(),
                        accepted_by: user.id
                      })
                      .eq('id', invite.id)
                  }

                  const slug = (invite as any).workspaces?.slug
                  const roleName = (invite as any).roles?.role_name || 'Junior Developer'
                  
                  const { revalidatePath } = await import('next/cache')
                  revalidatePath('/', 'layout')

                  const { getRolePath } = await import('@/lib/role-utils')
                  const rolePath = getRolePath(roleName)
                  
                  return NextResponse.redirect(`${origin}/dashboard/${slug}/${rolePath}`)
                }
              }

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
          return handleAuthenticatedUser(userProfile, adminClient, origin)
        }

        // Issue #14: Profile missing after OAuth — attempt repair before redirecting
        console.warn(`[auth/callback] No profile found for auth user ${user.id}. DB trigger may have failed.`)
        
        // Attempt auto-repair using OAuth metadata
        const fallbackName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'
        const fallbackAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null
        const fallbackEmployeeId = `EXT-${user.id.slice(0, 8).toUpperCase()}`

        const { data: repairedProfile } = await adminClient
          .from('users')
          .upsert({
            id: user.id,
            auth_id: user.id,
            email: (user.email || '').toLowerCase(),
            name: fallbackName,
            avatar_url: fallbackAvatar,
            employee_id: fallbackEmployeeId,
          }, { onConflict: 'id' })
          .select()
          .single()

        // Handle Invite Token
        if (token) {
          const { data: invite } = await adminClient
            .from('workspace_invites')
            .select('*, workspaces(name, slug), roles(role_name)')
            .eq('token', token)
            .eq('status', 'pending')
            .gt('expires_at', new Date().toISOString())
            .maybeSingle()

          if (invite && invite.email.toLowerCase() === user.email?.toLowerCase()) {
            // Join workspace
            await adminClient
              .from('workspace_members')
              .insert({
                workspace_id: invite.workspace_id,
                user_id: user.id,
                role_id: invite.role_id,
                joined_at: new Date().toISOString(),
              })

            // Accept invite
            await adminClient
              .from('workspace_invites')
              .update({ 
                status: 'accepted', 
                accepted_at: new Date().toISOString(),
                accepted_by: user.id
              })
              .eq('id', invite.id)

            const slug = (invite as any).workspaces?.slug
            const roleName = (invite as any).roles?.role_name || 'Junior Developer'
            
            const { revalidatePath } = await import('next/cache')
            revalidatePath('/', 'layout')

            const { getRolePath } = await import('@/lib/role-utils')
            const rolePath = getRolePath(roleName)
            
            return NextResponse.redirect(`${origin}/dashboard/${slug}/${rolePath}`)
          }
        }

        // After repair, redirect to workspace onboarding (no memberships yet)
        if (isInviteRedirect) {
          return NextResponse.redirect(`${origin}${next}`)
        }
        
        if (repairedProfile) {
          return handleAuthenticatedUser(repairedProfile, adminClient, origin)
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
  // or workspace creation
  return NextResponse.redirect(`${origin}/workspace`)
}
