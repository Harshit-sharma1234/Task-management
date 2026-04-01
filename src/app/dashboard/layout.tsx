import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { createClient } from '@/lib/supabase/server';
import { getCachedUserProfile, getCachedUnreadCount } from '@/lib/cache';
import { redirect } from 'next/navigation';

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

  // Preload data in parallel
  const [profile, unreadCount] = await Promise.all([
    getCachedUserProfile(user.email!),
    getCachedUnreadCount(user.id)
  ]);

  const initialProfile = profile ? {
    name: profile.name,
    avatar_url: profile.avatar_url || null
  } : undefined;

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <Sidebar initialUnreadCount={unreadCount} />
      <div className="flex-1 flex flex-col min-w-0 bg-[#fbfbfb]">
        <Header initialProfile={initialProfile} />
        <main className="flex-1 overflow-y-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
