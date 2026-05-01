
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hkvolrsnqttkmysalbha.supabase.co'
const supabaseKey = 'sb_secret_EB9QMs5K9G_Rs5wTrE8KRQ_ufTWFtM1'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkConstraints() {
  const { data, error } = await supabase.rpc('get_constraints', { t_name: 'projects' })
  
  if (error) {
    // If RPC doesn't exist, try a direct query to pg_constraint
    const { data: pgData, error: pgError } = await supabase
      .from('pg_constraint')
      .select('*')
      // This might fail if RLS is on or if we don't have access to pg_catalog via postgrest
    
    console.log('Error fetching via RPC:', error)
    
    // Alternative: Try to just insert a dummy project with various priorities to see which ones fail
    const priorities = ['no_priority', 'urgent', 'high', 'medium', 'low', 'none']
    for (const p of priorities) {
      const { error: insertError } = await supabase
        .from('projects')
        .insert({
          project_name: 'Test ' + p,
          priority: p,
          workspace_id: 'abcef4b2-a402-4757-8589-d8f41c223c17', // From user metadata
          created_by: '80931535-6453-4318-8f81-2292f9547d25' // From user metadata
        })
      
      if (insertError) {
        console.log(`Priority '${p}' FAILED:`, insertError.message)
      } else {
        console.log(`Priority '${p}' SUCCEEDED`)
        // Cleanup
        await supabase.from('projects').delete().eq('project_name', 'Test ' + p)
      }
    }
  } else {
    console.log('Constraints:', data)
  }
}

checkConstraints()
