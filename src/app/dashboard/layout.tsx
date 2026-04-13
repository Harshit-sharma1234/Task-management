import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { getServerUser, getServerProfile } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { PageTransition } from '@/components/dashboard/PageTransition';
import { LoadingProgress } from '@/components/dashboard/LoadingProgress';
import { DashboardToaster } from '@/components/dashboard/DashboardToaster';
import { fetchPendingOnboardingCount } from './onboarding/actions';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch profile for role-based sidebar rendering
  const profile = await getServerProfile(user.email!);
  const userRole = profile?.roles?.role_name || '';
  const isAdminOrPm = userRole === 'Admin' || userRole === 'Project Manager';

  // Fetch pending onboarding count only for Admin/PM (avoids unnecessary DB call for devs)
  const pendingOnboardingCount = isAdminOrPm ? await fetchPendingOnboardingCount() : 0;

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <DashboardToaster />
      <LoadingProgress />
      <Sidebar 
        userId={user.id} 
        userRole={userRole} 
        pendingOnboardingCount={pendingOnboardingCount} 
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
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
