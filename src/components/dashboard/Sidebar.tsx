'use client'

import { useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useNotificationStore } from '@/lib/store/notifications';
import { 
  Building2, 
  ChevronDown, 
  LayoutDashboard, 
  FolderKanban, 
  Users, 
  Settings, 
  ChevronRight,
  CircleDot,
  Bell,
  UserCheck
} from 'lucide-react';

interface SidebarProps {
  initialUnreadCount?: number;
  userId: string;
  userRole?: string;
  pendingOnboardingCount?: number;
}

export function Sidebar({ initialUnreadCount, userId, userRole, pendingOnboardingCount = 0 }: SidebarProps) {
  const isAdminOrPm = userRole === 'Admin' || userRole === 'Project Manager';
  const pathname = usePathname();
  const router = useRouter();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const isHydrated = useNotificationStore((s) => s.isHydrated);
  const supabase = useMemo(() => createClient(), []);
  const didHydrate = useRef(false);
  const prefetchedRoutes = useRef<Set<string>>(new Set());

  const handlePrefetch = (route: string) => {
    if (!prefetchedRoutes.current.has(route)) {
      router.prefetch(route);
      prefetchedRoutes.current.add(route);
    }
  };

  // Hydrate Zustand store autonomously (Layout Slimming)
  useEffect(() => {
    if (didHydrate.current) return;

    if (initialUnreadCount !== undefined) {
      setUnreadCount(initialUnreadCount);
      didHydrate.current = true;
    } else {
      // Fetch initial count if not provided by parent
      const fetchInitialCount = async () => {
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_read', false);
        setUnreadCount(count || 0);
        didHydrate.current = true;
      };
      fetchInitialCount();
    }
  }, [initialUnreadCount, setUnreadCount, userId, supabase]);

  // Realtime subscription only — no initial fetch needed (data comes from server)
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('sidebar-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          const { count: newCount } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);
          setUnreadCount(newCount || 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, setUnreadCount]);

  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white flex flex-col h-full">
      {/* Workspace Selector */}
      <Link 
        href="/dashboard" 
        prefetch={false} 
        onMouseEnter={() => handlePrefetch('/dashboard')}
        onFocus={() => handlePrefetch('/dashboard')}
        className="h-16 flex items-center px-6 border-b border-gray-100/50 justify-between cursor-pointer hover:bg-slate-50/80 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-100 group-hover:scale-105 transition-transform">
            <Building2 size={16} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-800 leading-tight tracking-tight">Tectome</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5">Workspace</span>
          </div>
        </div>
        <ChevronDown size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
      </Link>

      {/* Main Navigation */}
      <nav className="flex-1 py-6 px-4 flex flex-col gap-1.5">
        <Link 
          href="/dashboard" 
          prefetch={false}
          onMouseEnter={() => handlePrefetch('/dashboard')}
          onFocus={() => handlePrefetch('/dashboard')}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg group transition-all duration-300 ${
            pathname === '/dashboard' || pathname === '/dashboard/pm' || pathname === '/dashboard/dev' || pathname === '/dashboard/admin' 
              ? 'bg-indigo-50/50 text-indigo-600 shadow-sm ring-1 ring-indigo-100/50' 
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard size={18} strokeWidth={2} className={
            pathname === '/dashboard' || pathname === '/dashboard/pm' || pathname === '/dashboard/dev' || pathname === '/dashboard/admin' ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
          } />
          <span className="text-sm font-semibold tracking-tight">Dashboard</span>
        </Link>
        <Link 
          href="/dashboard/inbox" 
          prefetch={false}
          onMouseEnter={() => handlePrefetch('/dashboard/inbox')}
          onFocus={() => handlePrefetch('/dashboard/inbox')}
          className={`flex items-center justify-between px-3 py-2 rounded-lg group transition-all duration-300 ${
            pathname === '/dashboard/inbox' 
              ? 'bg-indigo-50/50 text-indigo-600 shadow-sm ring-1 ring-indigo-100/50' 
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <Bell size={18} strokeWidth={2} className={
              pathname === '/dashboard/inbox' ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
            } />
            <span className="text-sm font-semibold tracking-tight">Inbox</span>
          </div>
          {unreadCount > 0 && (
            <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-lg shadow-indigo-100 animate-in zoom-in duration-500">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
        <Link 
          href="/dashboard/projects" 
          prefetch={false}
          onMouseEnter={() => handlePrefetch('/dashboard/projects')}
          onFocus={() => handlePrefetch('/dashboard/projects')}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg group transition-all duration-300 ${
            pathname.startsWith('/dashboard/projects') 
              ? 'bg-indigo-50/50 text-indigo-600 shadow-sm ring-1 ring-indigo-100/50' 
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <FolderKanban size={18} strokeWidth={2} className={
            pathname.startsWith('/dashboard/projects') ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
          } />
          <span className="text-sm font-semibold tracking-tight">Projects</span>
        </Link>
        <Link 
          href="/dashboard/issues" 
          prefetch={false}
          onMouseEnter={() => handlePrefetch('/dashboard/issues')}
          onFocus={() => handlePrefetch('/dashboard/issues')}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg group transition-all duration-300 ${
            pathname.startsWith('/dashboard/issues') 
              ? 'bg-indigo-50/50 text-indigo-600 shadow-sm ring-1 ring-indigo-100/50' 
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <CircleDot size={18} strokeWidth={2} className={
            pathname.startsWith('/dashboard/issues') ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
          } />
          <span className="text-sm font-semibold tracking-tight">Issues</span>
        </Link>
        <Link 
          href="/dashboard/team" 
          prefetch={false}
          onMouseEnter={() => handlePrefetch('/dashboard/team')}
          onFocus={() => handlePrefetch('/dashboard/team')}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg group transition-all duration-300 ${
            pathname.startsWith('/dashboard/team') 
              ? 'bg-indigo-50/50 text-indigo-600 shadow-sm ring-1 ring-indigo-100/50' 
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Users size={18} strokeWidth={2} className={
            pathname.startsWith('/dashboard/team') ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
          } />
          <span className="text-sm font-semibold tracking-tight">Team</span>
        </Link>
        {isAdminOrPm && (
          <Link 
            href="/dashboard/onboarding" 
            prefetch={false}
            onMouseEnter={() => handlePrefetch('/dashboard/onboarding')}
            onFocus={() => handlePrefetch('/dashboard/onboarding')}
            className={`flex items-center justify-between px-3 py-2 rounded-lg group transition-all duration-300 ${
              pathname.startsWith('/dashboard/onboarding') 
                ? 'bg-indigo-50/50 text-indigo-600 shadow-sm ring-1 ring-indigo-100/50' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <UserCheck size={18} strokeWidth={2} className={
                pathname.startsWith('/dashboard/onboarding') ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
              } />
              <span className="text-sm font-semibold tracking-tight">Onboarding</span>
            </div>
            {pendingOnboardingCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
                {pendingOnboardingCount > 99 ? '99+' : pendingOnboardingCount}
              </span>
            )}
          </Link>
        )}
        <Link 
          href="/dashboard/settings" 
          prefetch={false}
          onMouseEnter={() => handlePrefetch('/dashboard/settings')}
          onFocus={() => handlePrefetch('/dashboard/settings')}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg group transition-all duration-300 ${
            pathname.startsWith('/dashboard/settings') 
              ? 'bg-indigo-50/50 text-indigo-600 shadow-sm ring-1 ring-indigo-100/50' 
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Settings size={18} strokeWidth={2} className={
            pathname.startsWith('/dashboard/settings') ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
          } />
          <span className="text-sm font-semibold tracking-tight">Settings</span>
        </Link>

        {/* My Tasks Section */}
        <div className="mt-8 flex flex-col gap-1.5 pt-6 border-t border-slate-50">
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-loose mb-2">Private</p>
          <Link 
            href="/dashboard/my-tasks"
            prefetch={false}
            onMouseEnter={() => handlePrefetch('/dashboard/my-tasks')}
            onFocus={() => handlePrefetch('/dashboard/my-tasks')}
            className={`flex items-center justify-between px-3 py-2 rounded-lg group transition-all duration-300 ${
              pathname === '/dashboard/my-tasks'
                ? 'bg-indigo-50/50 text-indigo-600 shadow-sm ring-1 ring-indigo-100/50' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <CircleDot size={18} strokeWidth={2} className={
                pathname === '/dashboard/my-tasks' ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
              } />
              <span className="text-sm font-semibold tracking-tight">My Tasks</span>
            </div>
            <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
          </Link>
        </div>

      </nav>
    </aside>
  );
}
