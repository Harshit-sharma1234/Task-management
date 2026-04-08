import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { getServerUser } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { PageTransition } from '@/components/dashboard/PageTransition';
import { LoadingProgress } from '@/components/dashboard/LoadingProgress';
import { DashboardToaster } from '@/components/dashboard/DashboardToaster';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();

  if (!user) {
    redirect('/login');
  }

  /**
   * ── PERFORMANCE OPTIMIZATION ──
   * Moving 'profile' and 'unreadCount' fetching out of the Layout.
   * This prevents these queries from blocking the main layout render 
   * and eliminates redundant soft-navigation fetches.
   * Header and Sidebar will now handle their own data.
   */

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <DashboardToaster />
      <LoadingProgress />
      <Sidebar userId={user.id} />
      <div className="flex-1 flex flex-col min-w-0 bg-[#fbfbfb]">
        <Header userId={user.id} email={user.email!} />
        <main className="flex-1 overflow-y-auto w-full">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
