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
