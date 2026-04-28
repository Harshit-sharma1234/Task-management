'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function diagnoseRLS() {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  
  // 1. Check current role from DB perspective
  const { data: roleInfo } = await adminClient.rpc('get_current_role_info').catch(() => ({ data: 'RPC NOT FOUND' }))
  
  // 2. Check membership
  const { data: membership } = await adminClient
    .from('workspace_members')
    .select('*, roles(role_name)')
    .eq('user_id', user?.id)

  // 3. Test insert
  const { data: testTicket, error: testError } = await adminClient
    .from('tickets')
    .insert({
      title: 'DIAGNOSTIC TEST ' + Date.now(),
      project_id: (await adminClient.from('projects').select('id').limit(1).single()).data?.id,
      workspace_id: (await adminClient.from('projects').select('workspace_id').limit(1).single()).data?.workspace_id,
      created_by: user?.id,
      status: 'to_do',
      priority: 'no_priority'
    })
    .select('id')
    .single()

  return {
    user: user?.id,
    currentRole: (await adminClient.rpc('get_current_role')).data,
    membershipCount: membership?.length || 0,
    membership: membership,
    testInsert: {
      success: !testError,
      error: testError
    },
    envVarsPresent: {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  }
}
