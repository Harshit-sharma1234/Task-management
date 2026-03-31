'use client';

import { Search, Moon, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
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

  useEffect(() => {
    const supabase = createClient()

    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser()
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
    }

    fetchUser()

    // Re-fetch profile when session recovers (e.g. after network change)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchUser()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  return (
    <>
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
          
          {/* User Profile avatar */}
          {userProfile?.avatar_url ? (
              <img 
                src={userProfile.avatar_url} 
                alt="Profile" 
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

          {/* Separator */}
          <div className="w-px h-6 bg-gray-200 mx-1"></div>

          {/* Sign Out Button */}
          <button 
            onClick={() => setShowSignOutConfirm(true)}
            className="text-gray-500 hover:text-red-600 flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors text-sm font-medium"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setShowSignOutConfirm(false)} 
          />
          {/* Dialog */}
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
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
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

