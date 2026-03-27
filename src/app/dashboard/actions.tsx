'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createProject(formData: FormData) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'You must be logged in to create a project' }
    }

    const projectName = formData.get('project_name') as string
    const description = formData.get('description') as string

    if (!projectName?.trim()) {
        return { error: 'Project name is required' }
    }

    const { error } = await supabase
        .from('projects')
        .insert({
            project_name: projectName,
            description: description || null,
            created_by: user.id
        })

    if (error) {
        console.error('Error creating project:', error)
        return { error: 'Failed to create project.' }
    }

    revalidatePath('/dashboard')

    return { success: true }
}

export async function updateUserPassword(password: string) {
    const supabase = await createClient()
    
    // Ensure the user is logged in
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: 'You must be logged in to update your password.' }
    }

    const { error } = await supabase.auth.updateUser({ password })
    
    if (error) {
        console.error('Error updating password:', error)
        return { error: error.message }
    }

    return { success: true }
}

export async function updateUserAvatar(userId: string, avatarUrl: string) {
    const supabase = await createClient()
    
    // Get the email and ID from Auth to verify they match what we are trying to update
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    console.log(`[Avatar Update] Auth UID: ${user.id}, Target User ID: ${userId}, Email: ${user.email}`)

    // 1. Try to find the existing row by ID OR Email
    const { data: existingRows } = await supabase
        .from('users')
        .select('id, email')
        .or(`id.eq.${userId},email.eq.${user.email}`)

    const targetRow = existingRows?.[0]

    let error;
    if (targetRow) {
        console.log(`[Avatar Update] Found existing row by ${targetRow.id === userId ? 'ID' : 'Email'}. Updating...`)
        // 2. Perform an UPDATE on the existing row (using its actual ID)
        const { error: updateError } = await supabase
            .from('users')
            .update({ 
                avatar_url: avatarUrl,
                id: userId, // Fix the ID if it was different
                name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
            })
            .eq('email', user.email)
        error = updateError
    } else {
        console.log('[Avatar Update] No existing row found. Attempting INSERT (this may fail if columns occupy not-null constraints)')
        // 3. Perform an INSERT if absolutely new
        // Note: This needs a default for employee_id if it's required
        const { error: insertError } = await supabase
            .from('users')
            .insert({ 
                id: userId, 
                avatar_url: avatarUrl,
                email: user.email,
                name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                employee_id: `EMP-${Date.now()}`, // Temporary fallback for required columns
                role_id: '861a7a01-447a-40ed-8785-580798939c81' // Hardcoded Developer role as fallback
            })
        error = insertError
    }

    if (error) {
        console.error('[Avatar Update] Database error during profile sync:', error)
        return { error: error.message }
    }

    console.log('[Avatar Update] Successfully synced user profile and avatar.')
    return { success: true }
}
