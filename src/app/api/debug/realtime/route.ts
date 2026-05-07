import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET() {
  const adminClient = createAdminClient();
  
  // Attempt to enable realtime for critical tables via SQL
  const sql = `
    DO $$ 
    BEGIN 
      -- 1. Ensure the publication exists
      IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
      END IF;

      -- 2. Add tables to publication if not already present
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'workspace_members') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE workspace_members;
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tickets') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'comments') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE comments;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'projects') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE projects;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'workspaces') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE workspaces;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'users') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE users;
      END IF;
    END $$;
  `;

  try {
    // Note: The Supabase JS client doesn't have a .sql() method. 
    // We'd usually do this via a migration or the dashboard.
    // However, I can try to use the REST API if configured, but that's unlikely.
    
    // Instead, I'll provide this SQL to the user as a last resort.
    return NextResponse.json({ 
      message: 'To fix real-time, please run this SQL in your Supabase SQL Editor',
      sql: sql.trim()
    });
  } catch (error) {
    return NextResponse.json({ error: (error as any).message }, { status: 500 });
  }
}
