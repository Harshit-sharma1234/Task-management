'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useNotificationStore } from '@/lib/store/notifications';
import {
  Building2,
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  ChevronRight,
  ChevronDown,
  CircleDot,
  Bell,
  PlusCircle,
  Check
} from 'lucide-react';


interface WorkspaceInfo {
  id: string;
  name: string;
  slug: string;
  role?: string;
}

interface SidebarProps {
  initialUnreadCount?: number;
  userId: string;
  userRole?: string;
  workspaceName?: string;
  workspaceSlug?: string;
  availableWorkspaces?: WorkspaceInfo[];
  activeWorkspaceId?: string;
  profileData?: {
    name: string;
    email: string;
    avatar_url: string | null;
    role: string;
  } | null;
}

function getRolePath(roleName: string): string {
  switch (roleName) {
    case 'Admin': return 'admin'
    case 'Project Manager': return 'project-manager'
    case 'Senior Developer': return 'senior-developer'
    case 'Junior Developer': return 'junior-developer'
    default: return 'junior-developer'
  }
}

export function Sidebar({
  initialUnreadCount,
  userId,
  userRole,
  workspaceName,
  workspaceSlug,
  availableWorkspaces = [],
  activeWorkspaceId,
  profileData
}: SidebarProps) {
  const isAdminOrPm = userRole === 'Admin' || userRole === 'Project Manager';
  const pathname = usePathname();
  const router = useRouter();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const supabase = useMemo(() => createClient(), []);
  const didHydrate = useRef(false);
  const prefetchedRoutes = useRef<Set<string>>(new Set());
  const [showSwitcher, setShowSwitcher] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  const basePath = workspaceSlug && userRole
    ? `/dashboard/${workspaceSlug}/${getRolePath(userRole)}`
    : '/dashboard';

  const handlePrefetch = (route: string) => {
    if (!prefetchedRoutes.current.has(route)) {
      router.prefetch(route);
      prefetchedRoutes.current.add(route);
    }
  };

  // Close switcher on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setShowSwitcher(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Hydrate notification count
  useEffect(() => {
    if (didHydrate.current) return;
    if (initialUnreadCount !== undefined) {
      setUnreadCount(initialUnreadCount);
      didHydrate.current = true;
    } else {
      const fetchInitialCount = async () => {
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'estimated', head: true })
          .eq('user_id', userId)
          .eq('is_read', false);
        setUnreadCount(count || 0);
        didHydrate.current = true;
      };
      fetchInitialCount();
    }
  }, [initialUnreadCount, setUnreadCount, userId, supabase]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('sidebar-notifications')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, async () => {
        const { count: newCount } = await supabase
          .from('notifications')
          .select('*', { count: 'estimated', head: true })
          .eq('user_id', userId)
          .eq('is_read', false);
        setUnreadCount(newCount || 0);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, supabase, setUnreadCount]);

  const isDashboard = pathname === basePath || pathname.startsWith('/dashboard') && (
    pathname.endsWith('/admin') || pathname.endsWith('/project-manager') ||
    pathname.endsWith('/senior-developer') || pathname.endsWith('/junior-developer')
  );

  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white flex flex-col h-full">
      {/* Workspace Switcher */}
      <div className="relative" ref={switcherRef}>
        <button
          onClick={() => setShowSwitcher(!showSwitcher)}
          className="w-full h-16 flex items-center px-6 border-b border-gray-100/50 justify-between cursor-pointer hover:bg-slate-50/80 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-100 group-hover:scale-105 transition-transform">
              <Building2 size={16} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold text-slate-800 leading-tight tracking-tight truncate max-w-[140px]">
                {workspaceName || 'Tectome'}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5">
                {userRole || 'Workspace'}
              </span>
            </div>
          </div>
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${showSwitcher ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {showSwitcher && (
          <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-b-xl shadow-xl animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="p-2 max-h-64 overflow-y-auto">
              {availableWorkspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    setShowSwitcher(false);
                    router.push(`/dashboard/${ws.slug}/${getRolePath(ws.role || 'Junior Developer')}`);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left group"
                >
                  <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    <Building2 size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-slate-700 block truncate">{ws.name}</span>
                    <span className="text-[10px] text-slate-400">{ws.role}</span>
                  </div>
                  {ws.id === activeWorkspaceId && (
                    <Check size={14} className="text-indigo-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-gray-100 p-2">
              <Link
                href="/workspace"
                onClick={() => setShowSwitcher(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-sm text-slate-500 hover:text-slate-700"
              >
                <PlusCircle size={14} />
                <span>Create workspace</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-6 px-4 flex flex-col gap-1.5">
        <Link
          href={basePath}
          prefetch={false}
          onMouseEnter={() => handlePrefetch(basePath)}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg group transition-all duration-300 ${isDashboard
            ? 'bg-indigo-50/80 text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
        >
          <LayoutDashboard size={18} strokeWidth={2} className={isDashboard ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} />
          <span className="text-sm font-semibold tracking-tight">Dashboard</span>
        </Link>
        <Link
          href={`/dashboard/${workspaceSlug}/inbox`}
          prefetch={false}
          onMouseEnter={() => handlePrefetch(`/dashboard/${workspaceSlug}/inbox`)}
          className={`flex items-center justify-between px-3 py-2 rounded-lg group transition-all duration-300 ${pathname === `/dashboard/${workspaceSlug}/inbox`
              ? 'bg-indigo-50/80 text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
        >
          <div className="flex items-center gap-3">
            <Bell size={18} strokeWidth={2} className={pathname === '/dashboard/inbox' ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} />
            <span className="text-sm font-semibold tracking-tight">Inbox</span>
          </div>
          {unreadCount > 0 && (
            <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-lg shadow-indigo-100 animate-in zoom-in duration-500">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
        <Link
          href={`/dashboard/${workspaceSlug}/projects`}
          prefetch={false}
          onMouseEnter={() => handlePrefetch(`/dashboard/${workspaceSlug}/projects`)}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg group transition-all duration-300 ${pathname.startsWith(`/dashboard/${workspaceSlug}/projects`)
              ? 'bg-indigo-50/80 text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
        >
          <FolderKanban size={18} strokeWidth={2} className={pathname.startsWith('/dashboard/projects') ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} />
          <span className="text-sm font-semibold tracking-tight">Projects</span>
        </Link>
        <Link
          href={`/dashboard/${workspaceSlug}/issues`}
          prefetch={false}
          onMouseEnter={() => handlePrefetch(`/dashboard/${workspaceSlug}/issues`)}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg group transition-all duration-300 ${pathname.startsWith(`/dashboard/${workspaceSlug}/issues`)
              ? 'bg-indigo-50/80 text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
        >
          <CircleDot size={18} strokeWidth={2} className={pathname.startsWith(`/dashboard/${workspaceSlug}/issues`) ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} />
          <span className="text-sm font-semibold tracking-tight">Issues</span>
        </Link>
        <Link
          href={`/dashboard/${workspaceSlug}/team`}
          prefetch={false}
          onMouseEnter={() => handlePrefetch(`/dashboard/${workspaceSlug}/team`)}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg group transition-all duration-300 ${pathname.startsWith(`/dashboard/${workspaceSlug}/team`)
              ? 'bg-indigo-50/80 text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
        >
          <Users size={18} strokeWidth={2} className={pathname.startsWith(`/dashboard/${workspaceSlug}/team`) ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} />
          <span className="text-sm font-semibold tracking-tight">Team</span>
        </Link>
        <Link
          href={`/dashboard/${workspaceSlug}/settings`}
          prefetch={false}
          onMouseEnter={() => handlePrefetch(`/dashboard/${workspaceSlug}/settings`)}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg group transition-all duration-300 ${pathname.startsWith(`/dashboard/${workspaceSlug}/settings`)
              ? 'bg-indigo-50/80 text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
        >
          <Settings size={18} strokeWidth={2} className={pathname.startsWith(`/dashboard/${workspaceSlug}/settings`) ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} />
          <span className="text-sm font-semibold tracking-tight">Settings</span>
        </Link>

        {/* My Tasks Section */}
        <div className="mt-8 flex flex-col gap-1.5 pt-6 border-t border-slate-50">
          <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-loose mb-2">Private</p>
          <Link
            href={`/dashboard/${workspaceSlug}/my-tasks`}
            prefetch={false}
            onMouseEnter={() => handlePrefetch(`/dashboard/${workspaceSlug}/my-tasks`)}
            className={`flex items-center justify-between px-3 py-2 rounded-lg group transition-all duration-300 ${pathname === `/dashboard/${workspaceSlug}/my-tasks`
                ? 'bg-indigo-50/80 text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
          >
            <div className="flex items-center gap-3">
              <CircleDot size={18} strokeWidth={2} className={pathname === `/dashboard/${workspaceSlug}/my-tasks` ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} />
              <span className="text-sm font-semibold tracking-tight">My Tasks</span>
            </div>
            <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
          </Link>
        </div>

      </nav>

    </aside>
  );
}
