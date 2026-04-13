import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { getServerUser } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { LoadingProgress } from '@/components/dashboard/LoadingProgress';
import { DashboardToaster } from '@/components/dashboard/DashboardToaster';
import { GlobalDataSync } from '@/components/dashboard/GlobalDataSync';
import { fetchGlobalSnapshot } from '@/lib/actions/GlobalSyncActions';
import { fetchPendingOnboardingCount } from './onboarding/actions';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();
  if (!user) redirect('/login');

  // SERVER-SIDE HYDRATION: Fetch everything in one parallel hit
  const [snapshot, pendingOnboardingCount] = await Promise.all([
    fetchGlobalSnapshot(),
    fetchPendingOnboardingCount()
  ]);

  if ('error' in snapshot) redirect('/login');

  const profile = snapshot.profile;
  const userRole = profile?.roles?.role_name || '';
  const isAdminOrPm = userRole === 'Admin' || userRole === 'Project Manager';
  const displayOnboardingCount = isAdminOrPm ? pendingOnboardingCount : 0;

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <DashboardToaster />
      <GlobalDataSync initialData={snapshot} />
      <LoadingProgress />
      <Sidebar 
        userId={user.id} 
        userRole={userRole} 
        pendingOnboardingCount={displayOnboardingCount} 
        profileData={profile ? {
          name: profile.name,
          email: profile.email,
          avatar_url: profile.avatar_url || null,
          role: profile.roles?.role_name || ''
        } : null}
      />
      <div className="flex-1 flex flex-col min-w-0 bg-[#fbfbfb]">
        <Header userId={user.id} email={user.email!} profileData={profile ? {
          name: profile.name,
          email: profile.email,
          avatar_url: profile.avatar_url || null,
          role: profile.roles?.role_name || ''
        } : null} />
        <main className="flex-1 overflow-y-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
