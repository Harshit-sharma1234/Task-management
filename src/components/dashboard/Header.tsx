'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useState, useMemo, useCallback } from 'react';
import { UserDropdown } from './UserDropdown';

export function Header({ initialProfile }: { initialProfile?: any }) {
  const router = useRouter();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  // Derive the profile shape from server-provided data — no client-side fetch needed
  const userProfile = initialProfile ? {
    name: initialProfile.name,
    email: initialProfile.email,
    avatar_url: initialProfile.avatar_url,
    role: Array.isArray(initialProfile.roles) 
      ? initialProfile.roles[0]?.role_name 
      : initialProfile.roles?.role_name
  } : null;

  const handleSignOut = useCallback(async () => {
    setShowSignOutConfirm(false);
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (error) {
      setSigningOut(false);
    }
  }, [supabase, router]);

  return (
    <>
      {/* Premium Signing Out Overlay */}
      {signingOut && (
        <div className="fixed inset-0 bg-[#0e0e11]/80 backdrop-blur-md z-[9999] flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="flex flex-col items-center gap-6 p-10 rounded-3xl bg-[#1e1e24] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-[#2c2d33] scale-in-center">
            <div className="relative flex items-center justify-center">
              <div className="h-20 w-20 border-4 border-[#2c2d33] rounded-full"></div>
              <div className="h-20 w-20 border-t-4 border-[#5e6ad2] rounded-full animate-spin absolute top-0 left-0"></div>
              <LogOut size={32} className="text-[#5e6ad2] absolute" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Signing out</h2>
              <p className="text-sm text-[#8a8f98] font-medium">Please wait while we secure your session...</p>
            </div>
            <div className="w-48 h-1 bg-[#2c2d33] rounded-full overflow-hidden mt-2">
              <div className="h-full bg-[#5e6ad2] animate-shimmer w-full"></div>
            </div>
          </div>
        </div>
      )}

      <header className="h-16 border-b border-gray-100 bg-white flex items-center justify-between px-8 shrink-0">
        <div className="flex-1 overflow-hidden" />
        
        <div className="flex items-center gap-4">
          {userProfile && (
            <UserDropdown 
              profile={userProfile} 
              onSignOut={() => setShowSignOutConfirm(true)} 
            />
          )}
        </div>
      </header>

      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-[#0e0e11]/40 backdrop-blur-[4px] animate-in fade-in duration-300"
            onClick={() => setShowSignOutConfirm(false)} 
          />
          <div className="relative bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 px-8 py-8 w-full max-w-sm mx-4 animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 ring-8 ring-red-50/50">
              <LogOut size={32} className="text-red-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Come back soon</h3>
            <p className="text-[15px] font-medium text-gray-500 mb-8 leading-relaxed">Are you sure you want to sign out? You'll need to log in again to access your workspace.</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleSignOut}
                className="w-full py-3.5 text-[15px] font-bold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] rounded-2xl transition-all shadow-xl shadow-red-200"
              >
                Sign out
              </button>
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="w-full py-3.5 text-[15px] font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-2xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
