import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { createClient } from '@/lib/supabase/server';
import { getCachedUserProfile, getCachedUnreadCount } from '@/lib/cache';
import { redirect } from 'next/navigation';
import { PageTransition } from '@/components/dashboard/PageTransition';
import { LoadingProgress } from '@/components/dashboard/LoadingProgress';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // NOTE: We no longer await profile/unreadCount here to prevent blocking the layout render.
  // Sidebar and Header will sync their own data client-side for a smoother "Linear-style" experience.

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <LoadingProgress />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-[#fbfbfb]">
        <Header />
        <main className="flex-1 overflow-y-auto w-full">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
