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

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Use email-based fetching to match the Settings page (more reliable in this DB)
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
          // Fallback to auth metadata
          setUserProfile({ 
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User', 
            avatar_url: null 
          })
        }
      }
    }
    fetchUser()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh(); // Refresh to clear server state
    router.push('/login');
  };

  return (
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
        <button className="text-gray-500 hover:text-gray-700 flex items-center justify-center p-2 rounded-full hover:bg-gray-50 transition-colors">
          <Moon size={18} />
        </button>
        
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
          onClick={handleSignOut}
          className="text-gray-500 hover:text-red-600 flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors text-sm font-medium"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
