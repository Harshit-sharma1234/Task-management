'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { Users, Check, Search, Plus, X } from 'lucide-react';
import { toggleProjectMember } from '@/app/dashboard/actions';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
}

interface MemberSelectorProps {
  projectId: string;
  users: User[];
  currentMemberIds: string[];
  showEmails?: boolean;
  align?: 'left' | 'right';
}

export function MemberSelector({ 
  projectId, 
  users, 
  currentMemberIds, 
  showEmails = false,
  align = 'left' 
}: MemberSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();

  const currentMembers = users.filter(u => currentMemberIds.includes(u.id));
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (userId: string) => {
    startTransition(async () => {
      const result = await toggleProjectMember(projectId, userId);
      if (result?.error) {
        alert(result.error);
      }
    });
  };

  return (
    <div className={`relative ${align === 'right' ? 'w-full flex justify-end' : ''}`} ref={dropdownRef}>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`flex items-center gap-2.5 py-1 outline-none group focus:ring-2 focus:ring-indigo-500/20 rounded-md transition-all max-w-full ${align === 'right' ? 'justify-end' : 'justify-start'}`}
      >
        <div className="flex -space-x-1.5">
          {currentMembers.map(m => (
            <UserAvatar 
              key={m.id}
              name={m.name}
              avatarUrl={m.avatar_url}
              size="sm"
              className="shadow-sm ring-2 ring-white group-hover:border-gray-200 transition-colors relative"
            />
          ))}
          {currentMembers.length === 0 && (
            <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 shadow-sm border border-gray-100 group-hover:border-gray-200 transition-colors ring-2 ring-white relative">
              <Plus size={10} />
            </div>
          )}
        </div>
        <div className="flex items-center shrink-0">
          <span className="text-[11px] font-bold text-gray-700 group-hover:text-indigo-600 transition-colors bg-gray-50 px-2 py-0.5 rounded border border-gray-100/80 group-hover:bg-gray-100/50">
            {currentMembers.length} {currentMembers.length === 1 ? 'member' : 'members'}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} top-full mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200`}>
          <div className="p-2 border-b border-gray-50 flex items-center gap-2 bg-gray-50/50">
            <Search size={14} className="text-gray-400 ml-2" />
            <input 
              type="text"
              placeholder="Filter users..."
              className="w-full bg-transparent border-none outline-none text-xs py-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="max-h-60 overflow-y-auto p-1">
            {filteredUsers.length === 0 ? (
              <div className="p-3 text-center text-xs text-gray-400">No users found</div>
            ) : (
              filteredUsers.map((user) => {
                const isMember = currentMemberIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(user.id);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-2">
                      <UserAvatar 
                        name={user.name}
                        avatarUrl={user.avatar_url}
                        size="sm"
                      />
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-xs font-semibold text-gray-900 truncate">{user.name}</span>
                        <span className="text-[10px] text-gray-500 truncate">{user.email}</span>
                      </div>
                    </div>
                    {isMember && <Check size={14} className="text-indigo-600 shrink-0" />}
                    {!isMember && <Plus size={14} className="text-gray-300 group-hover:text-gray-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
