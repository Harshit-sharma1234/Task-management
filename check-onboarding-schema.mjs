import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://hkvolrsnqttkmysalbha.supabase.co',
  'sb_secret_Fb-_1x3VN-B9UFrPGaLMGw_vC-gHL_K'
)

const { data, error } = await supabase.from('users').select('onboarding_status').limit(1)
console.log('onboarding_status column:', error ? 'NOT FOUND: ' + error.message : 'EXISTS ✓')

const { data: d2, error: e2 } = await supabase.from('onboarding_requests').select('id').limit(1)
console.log('onboarding_requests table:', e2 ? 'NOT FOUND: ' + e2.message : 'EXISTS ✓')
