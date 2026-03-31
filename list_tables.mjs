import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function listTables() {
    console.log('--- Fetching Tables ---')
    const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')

    if (error) {
        console.error('Error:', JSON.stringify(error, null, 2))
        
        // Try a different approach if information_schema is restricted
        console.log('--- Trying to list via RPC or common tables ---')
        const commonTables = ['projects', 'users', 'roles', 'project_members', 'updates', 'project_updates', 'comments', 'activities']
        for (const table of commonTables) {
            const { error: tError } = await supabase.from(table).select('count').limit(1)
            if (!tError) {
                console.log(`- Found table: ${table}`)
            } else if (tError.code !== '42P01') { // 42P01 is "relation does not exist"
                console.log(`- Table ${table} exists but failed to query:`, tError.message)
            }
        }
        return
    }

    console.log('Available tables:')
    data.forEach(t => console.log(`- ${t.table_name}`))
}

await listTables()
