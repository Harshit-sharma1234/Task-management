import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const url = 'https://hkvolrsnqttkmysalbha.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Read from .env if needed
const envFile = fs.readFileSync('.env', 'utf8');
const match = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const adminKey = match ? match[1] : key;

const supabase = createClient(url, adminKey);

async function run() {
  const { count, error } = await supabase.from('tickets').select('*', { count: 'exact', head: true });
  console.log('Ticket Count:', count);
  console.log('Error (if any):', error);
  
  // Try querying pg_policies via a custom SQL function or REST if exposed? 
  // Wait, standard PG info is not exposed over REST by default.
  // I will check local SQL files for RLS definitions instead for the 'tickets' table.
}
run();
