'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { validateEmail } from '@/lib/validation'

function getAppOrigin(headerStore: Headers): string | null {
    const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
    if (configuredOrigin) return configuredOrigin

    const protocol = headerStore.get('x-forwarded-proto') ?? 'http'
    const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host')
    if (!host) return null

    return `${protocol}://${host}`
}

export async function requestPasswordResetLink(email: string) {
    const emailCheck = validateEmail(email)
    if (!emailCheck.valid) {
        return { error: emailCheck.error || 'Invalid email address' }
    }

    const normalizedEmail = email.trim().toLowerCase()
    const headerStore = await headers()
    const origin = getAppOrigin(headerStore)
    if (!origin) {
        return { error: 'Unable to determine app URL for reset link.' }
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${origin}/auth/set-password`,
    })
    if (error) {
        return { error: error.message }
    }

    return { success: true }
}
