'use client';

import { Search, LogOut, Settings, User as UserIcon, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import Link from 'next/link';

export function Header({ initialProfile }: { initialProfile?: any }) {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<{ name: string, email: string, avatar_url: string | null } | null>(
    initialProfile ? { ...initialProfile, email: initialProfile.email || '' } : null
  )
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function syncHeaderProfile(userOverride?: any) {
      try {
        let user = userOverride;
        if (!user) {
          const { data: { session } } = await supabase.auth.getSession();
          user = session?.user;
        }
        
        if (user) {
          const { data } = await supabase
              .from('users')
              .select('name, email, avatar_url')
              .eq('email', user.email)
          
          if (data && data.length > 0) {
            setUserProfile({ 
              name: data[0].name, 
              email: data[0].email,
              avatar_url: data[0].avatar_url 
            })
          } else {
            setUserProfile({ 
              name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User', 
              email: user.email || '',
              avatar_url: null 
            })
          }
        }
      } catch (err: any) {
        if (err?.message?.includes('Lock broken')) return;
        console.error('Header auth error:', err);
      }
    }

    syncHeaderProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        syncHeaderProfile(session?.user)
      }
    })

    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsPopupOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [supabase])

  const handleSignOut = useCallback(async () => {
    setShowSignOutConfirm(false);
    setIsPopupOpen(false);
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
        
        <div className="flex items-center gap-4 relative" ref={popupRef}>
          {/* Interactive User Trigger */}
          <button 
            onClick={() => setIsPopupOpen(!isPopupOpen)}
            className={`flex items-center gap-2 p-1 rounded-full hover:bg-gray-50 transition-all border ${isPopupOpen ? 'border-gray-200 bg-gray-50 ring-4 ring-gray-50' : 'border-transparent'}`}
          >
            <UserAvatar
              name={userProfile?.name || ''}
              avatarUrl={userProfile?.avatar_url}
              size="md"
              className={!userProfile ? 'animate-pulse bg-gray-100' : ''}
            />
          </button>

          {/* Premium Popup Menu */}
          {isPopupOpen && (
            <div className="absolute right-0 top-full mt-3 w-72 bg-white border border-gray-200 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] z-[100] p-1.5 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
              {/* User Identity Section */}
              <div className="px-4 py-4 mb-1">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={userProfile?.name || ''}
                    avatarUrl={userProfile?.avatar_url}
                    size="lg"
                    className="ring-2 ring-gray-50"
                  />
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[14px] font-bold text-gray-900 truncate leading-tight">
                      {userProfile?.name}
                    </span>
                    <span className="text-[12px] text-gray-500 truncate mt-0.5 font-medium">
                      {userProfile?.email}
                    </span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-100 mx-2 mb-1" />

              {/* Navigation Actions */}
              <div className="flex flex-col gap-0.5">
                <Link 
                  href="/dashboard/settings" 
                  onClick={() => setIsPopupOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-50 group-hover:bg-indigo-50 flex items-center justify-center transition-colors">
                    <UserIcon size={16} className="text-gray-400 group-hover:text-indigo-500" />
                  </div>
                  My Profile
                </Link>

                <Link 
                  href="/dashboard/settings" 
                  onClick={() => setIsPopupOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-50 group-hover:bg-indigo-50 flex items-center justify-center transition-colors">
                    <Settings size={16} className="text-gray-400 group-hover:text-indigo-500" />
                  </div>
                  System Settings
                </Link>

                <div className="h-px bg-gray-100 mx-2 my-1" />

                {/* Dangerous Action */}
                <button 
                  onClick={() => setShowSignOutConfirm(true)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-red-600 hover:bg-red-50 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-50/50 group-hover:bg-red-50 flex items-center justify-center transition-colors">
                    <LogOut size={16} className="text-red-400 group-hover:text-red-500" />
                  </div>
                  Sign out
                </button>
              </div>

              {/* Footer */}
              <div className="mt-2 text-center p-2">
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                  <Shield size={10} />
                  Secure Session
                </div>
              </div>
            </div>
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
