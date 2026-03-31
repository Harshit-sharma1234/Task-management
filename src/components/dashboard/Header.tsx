'use client';

import { Search, Moon, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

function stringToColor(str: string) {
    if (!str) return '#CBD5E1'
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
}

export function Header() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<{ name: string, avatar_url: string | null } | null>(null)
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const supabase = createClient()

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
              .select('name, avatar_url')
              .eq('email', user.email)
          
          if (data && data.length > 0) {
            setUserProfile({ 
              name: data[0].name, 
              avatar_url: data[0].avatar_url 
            })
          } else {
            setUserProfile({ 
              name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User', 
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

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    setShowSignOutConfirm(false);
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (error) {
      setSigningOut(false);
    }
  };

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
        <div className="flex-1 w-full max-w-md">
          <div className="relative flex items-center w-full">
            <Search size={16} className="absolute left-3 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search projects, tasks..." 
              className="w-full bg-white border border-gray-200 rounded-md py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {userProfile?.avatar_url ? (
              <Image 
                src={userProfile.avatar_url} 
                alt="Profile" 
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover shadow-sm border border-gray-100 cursor-pointer" 
              />
          ) : (
              <div 
                className="flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-semibold cursor-pointer shadow-sm"
                style={{ backgroundColor: userProfile ? stringToColor(userProfile.name) : '#4f46e5' }}
              >
                {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : ''}
              </div>
          )}

          <div className="w-px h-6 bg-gray-200 mx-1"></div>

          <button 
            onClick={() => setShowSignOutConfirm(true)}
            className="text-gray-500 hover:text-indigo-600 flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-indigo-50 transition-colors text-sm font-medium"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setShowSignOutConfirm(false)} 
          />
          <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 px-6 py-5 w-full max-w-sm mx-4 animate-in fade-in zoom-in duration-150">
            <h3 className="text-[15px] font-bold text-gray-900 mb-1">Confirm sign out</h3>
            <p className="text-sm text-gray-500 mb-5">Are you sure you want to sign out of your account?</p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-lg shadow-indigo-600/20"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
