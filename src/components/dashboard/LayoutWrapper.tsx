'use client';

import { useState, ReactNode, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { DashboardToaster } from './DashboardToaster';
import { LoadingProgress } from './LoadingProgress';
import { usePathname } from 'next/navigation';

interface LayoutWrapperProps {
  children: ReactNode;
  sidebar: ReactNode;
  header: ReactNode;
  globalSync: ReactNode;
}

export function LayoutWrapper({ children, sidebar, header, globalSync }: LayoutWrapperProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <DashboardToaster />
      {globalSync}
      <LoadingProgress />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-[70] bg-white transform transition-all duration-300 ease-in-out md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {sidebar}

        {/* Mobile Close Button */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 md:hidden"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#fbfbfb] relative">
        {/* Mobile Menu Toggle (Injected into Header area if needed, or overlay) */}
        {!isSidebarOpen && (
          <div className="md:hidden absolute top-4 left-6 z-[100]">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-600 hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <Menu size={20} />
            </button>
          </div>
        )}

        {header}

        <main className="flex-1 overflow-y-auto w-full outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
