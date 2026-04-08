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
  Bell
} from 'lucide-react';

interface SidebarProps {
  initialUnreadCount?: number;
  userId: string;
}

export function Sidebar({ initialUnreadCount, userId }: SidebarProps) {
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
        className="h-16 flex items-center px-4 border-b border-gray-100 justify-between cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-indigo-600 text-white">
            <Building2 size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900 leading-tight">Tectome</span>
          </div>
        </div>
      </Link>

      {/* Main Navigation */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
        <Link 
          href="/dashboard" 
          prefetch={false}
          onMouseEnter={() => handlePrefetch('/dashboard')}
          onFocus={() => handlePrefetch('/dashboard')}
          className={`flex items-center gap-3 px-3 py-2 rounded-md group transition-colors ${
            pathname === '/dashboard' || pathname === '/dashboard/pm' || pathname === '/dashboard/dev' || pathname === '/dashboard/admin' 
              ? 'bg-gray-100 text-gray-900' 
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <LayoutDashboard size={18} className={
            pathname === '/dashboard' || pathname === '/dashboard/pm' || pathname === '/dashboard/dev' || pathname === '/dashboard/admin' ? 'text-gray-700' : 'text-gray-500 group-hover:text-gray-700'
          } />
          <span className="text-sm font-medium">Dashboard</span>
        </Link>
        <Link 
          href="/dashboard/inbox" 
          prefetch={false}
          onMouseEnter={() => handlePrefetch('/dashboard/inbox')}
          onFocus={() => handlePrefetch('/dashboard/inbox')}
          className={`flex items-center justify-between px-3 py-2 rounded-md group transition-colors ${
            pathname === '/dashboard/inbox' 
              ? 'bg-gray-100 text-indigo-600' 
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <Bell size={18} className={
              pathname === '/dashboard/inbox' ? 'text-indigo-600' : 'text-gray-500 group-hover:text-gray-700'
            } />
            <span className="text-sm font-medium">Inbox</span>
          </div>
          {unreadCount > 0 && (
            <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
        <Link 
          href="/dashboard/projects" 
          prefetch={false}
          onMouseEnter={() => handlePrefetch('/dashboard/projects')}
          onFocus={() => handlePrefetch('/dashboard/projects')}
          className={`flex items-center gap-3 px-3 py-2 rounded-md group transition-colors ${
            pathname.startsWith('/dashboard/projects') 
              ? 'bg-gray-100 text-gray-900' 
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <FolderKanban size={18} className={
            pathname.startsWith('/dashboard/projects') ? 'text-gray-700' : 'text-gray-500 group-hover:text-gray-700'
          } />
          <span className="text-sm font-medium">Projects</span>
        </Link>
        <Link 
          href="/dashboard/issues" 
          prefetch={false}
          onMouseEnter={() => handlePrefetch('/dashboard/issues')}
          onFocus={() => handlePrefetch('/dashboard/issues')}
          className={`flex items-center gap-3 px-3 py-2 rounded-md group transition-colors ${
            pathname.startsWith('/dashboard/issues') 
              ? 'bg-gray-100 text-gray-900' 
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <CircleDot size={18} className={
            pathname.startsWith('/dashboard/issues') ? 'text-gray-700' : 'text-gray-500 group-hover:text-gray-700'
          } />
          <span className="text-sm font-medium">Issues</span>
        </Link>
        <Link 
          href="/dashboard/team" 
          prefetch={false}
          onMouseEnter={() => handlePrefetch('/dashboard/team')}
          onFocus={() => handlePrefetch('/dashboard/team')}
          className={`flex items-center gap-3 px-3 py-2 rounded-md group transition-colors ${
            pathname.startsWith('/dashboard/team') 
              ? 'bg-gray-100 text-gray-900' 
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Users size={18} className={
            pathname.startsWith('/dashboard/team') ? 'text-gray-700' : 'text-gray-500 group-hover:text-gray-700'
          } />
          <span className="text-sm font-medium">Team</span>
        </Link>
        <Link 
          href="/dashboard/settings" 
          prefetch={false}
          onMouseEnter={() => handlePrefetch('/dashboard/settings')}
          onFocus={() => handlePrefetch('/dashboard/settings')}
          className={`flex items-center gap-3 px-3 py-2 rounded-md group transition-colors ${
            pathname.startsWith('/dashboard/settings') 
              ? 'bg-gray-100 text-gray-900' 
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Settings size={18} className={
            pathname.startsWith('/dashboard/settings') ? 'text-gray-700' : 'text-gray-500 group-hover:text-gray-700'
          } />
          <span className="text-sm font-medium">Settings</span>
        </Link>

        {/* My Tasks Section */}
        <div className="mt-6 flex flex-col gap-1">
          <Link 
            href="/dashboard/my-tasks"
            prefetch={false}
            onMouseEnter={() => handlePrefetch('/dashboard/my-tasks')}
            onFocus={() => handlePrefetch('/dashboard/my-tasks')}
            className={`flex items-center justify-between px-3 py-2 rounded-md group transition-colors ${
              pathname === '/dashboard/my-tasks'
                ? 'bg-gray-100 text-indigo-600' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <CircleDot size={18} className={
                pathname === '/dashboard/my-tasks' ? 'text-indigo-600' : 'text-gray-500 group-hover:text-gray-700'
              } />
              <span className="text-sm font-medium">My Tasks</span>
            </div>
            <ChevronRight size={14} className="text-gray-400 group-hover:text-gray-600" />
          </Link>
        </div>

      </nav>
    </aside>
  );
}
