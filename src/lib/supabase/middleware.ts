import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Do not add logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    // If user is not authenticated and trying to access dashboard, redirect to login
    if (!user && pathname.startsWith('/dashboard')) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Allow unauthenticated access to onboarding status pages and signup
    if (!user && (pathname === '/onboarding-pending' || pathname === '/onboarding-rejected' || pathname === '/signup')) {
        return supabaseResponse
    }

    // If user is authenticated and on login or signup, check onboarding status first
    if (user && (pathname === '/login' || pathname === '/signup')) {
        const { data: profile } = await supabase
            .from('users')
            .select('onboarding_status')
            .eq('email', user.email)
            .maybeSingle()

        if (profile?.onboarding_status === 'pending') {
            const url = request.nextUrl.clone()
            url.pathname = '/onboarding-pending'
            return NextResponse.redirect(url)
        }
        if (profile?.onboarding_status === 'rejected') {
            const url = request.nextUrl.clone()
            url.pathname = '/onboarding-rejected'
            return NextResponse.redirect(url)
        }

        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    // Block pending/rejected users from accessing dashboard
    if (user && pathname.startsWith('/dashboard')) {
        const { data: statusCheck } = await supabase
            .from('users')
            .select('onboarding_status')
            .eq('email', user.email)
            .maybeSingle()

        if (statusCheck?.onboarding_status === 'pending') {
            const url = request.nextUrl.clone()
            url.pathname = '/onboarding-pending'
            return NextResponse.redirect(url)
        }
        if (statusCheck?.onboarding_status === 'rejected') {
            const url = request.nextUrl.clone()
            url.pathname = '/onboarding-rejected'
            return NextResponse.redirect(url)
        }
    }

    // Handle exact '/dashboard' routing (RBAC) to eliminate the Double Hop
    if (user && pathname === '/dashboard') {
        const { data } = await supabase
            .from('users')
            .select('roles(role_name)')
            .eq('email', user.email)
            .single()

        const roles = data?.roles as any
        const roleName = (Array.isArray(roles) ? roles[0]?.role_name : roles?.role_name) as string | undefined


        let targetPath = '/dashboard'
        if (roleName) {
            switch (roleName) {
                case 'Admin':
                    targetPath = '/dashboard/admin'
                    break
                case 'Project Manager':
                    targetPath = '/dashboard/pm'
                    break
                case 'Senior Developer':
                case 'Junior Developer':
                    targetPath = '/dashboard/dev'
                    break
            }
        }

        if (targetPath !== '/dashboard') {
            const url = request.nextUrl.clone()
            url.pathname = targetPath
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}
