'use client'

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const unreadCount = 0; // Placeholder for future inbox functionality

  // Prefetch all major routes on mount for "instant" navigation
  useEffect(() => {
    const routes = [
      '/dashboard',
      '/dashboard/projects',
      '/dashboard/issues',
      '/dashboard/team',
      '/dashboard/settings'
    ];
    routes.forEach(route => router.prefetch(route));
  }, [router]);

  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white flex flex-col h-full">
      {/* Workspace Selector */}
      <div className="h-16 flex items-center px-4 border-b border-gray-100 justify-between cursor-pointer hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-indigo-600 text-white">
            <Building2 size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900 leading-tight">Tectome</span>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
        <Link 
          href="/dashboard" 
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
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
          )}
        </Link>
        <Link 
          href="/dashboard/projects" 
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
          <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 rounded-md transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600">My Tasks</span>
            </div>
            <ChevronRight size={14} className="text-gray-400" />
          </div>
        </div>

        {/* Projects Section */}
        <div className="mt-4 flex flex-col gap-1">
          <div className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 rounded-md transition-colors">
            <span className="text-xs font-semibold text-gray-500 tracking-wider">PROJECTS</span>
            <ChevronRight size={14} className="text-gray-400" />
          </div>
        </div>
      </nav>
    </aside>
  );
}
