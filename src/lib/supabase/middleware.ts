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
    const isServerActionRequest = request.headers.has('next-action')

    // Protected routes that require authentication
    // Note: invite links must be accessible to new users without an account.
    // The invite pages themselves handle redirecting to /invite-signup or /login as appropriate.
    const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/workspace')
    
    // Auth routes that should redirect if already logged in
    const isAuthRoute = pathname === '/login' || pathname === '/signup'

    // Guard 1: No session + protected route → /login
    if (!user && isProtectedRoute) {
        // Let server actions execute and return structured auth errors
        // instead of returning an HTML redirect payload.
        if (isServerActionRequest) {
            return supabaseResponse
        }

        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Guard 2: Has session + auth route → /dashboard (login action handles workspace routing)
    if (user && isAuthRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
