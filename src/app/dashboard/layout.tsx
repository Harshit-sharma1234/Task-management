import { getServerUser } from '@/lib/auth-server';
import { redirect } from 'next/navigation';

/**
 * Root dashboard layout — minimal.
 * The workspace-scoped layout at /dashboard/[workspace]/[role]/layout.tsx 
 * handles the full sidebar/header for role-specific pages.
 * 
 * This layout exists to protect /dashboard/* routes and handle
 * the redirect logic for the catch-all /dashboard page.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();
  if (!user) redirect('/login');

  return <>{children}</>;
}
