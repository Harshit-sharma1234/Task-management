'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { Users, Check, Search, Plus, X } from 'lucide-react';
import { toggleProjectMember } from '@/app/dashboard/actions';

interface User {
  id: string;
  name: string;
  email: string;
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

  const getInitials = (name: string) => {
    return name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
  }

  const getBadgeColor = (name: string) => {
    const colors = [
      'bg-gradient-to-br from-orange-400 to-orange-500', 
      'bg-gradient-to-br from-indigo-400 to-indigo-500', 
      'bg-gradient-to-br from-emerald-400 to-emerald-500', 
      'bg-gradient-to-br from-purple-400 to-purple-500', 
      'bg-gradient-to-br from-pink-400 to-pink-500'
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return `${colors[Math.abs(hash) % colors.length]} text-white`
  }

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
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 py-1 group"
      >
        <div className="flex -space-x-2 mr-1">
          {currentMembers.slice(0, 3).map(m => (
            <div 
              key={m.id} 
              className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold ${getBadgeColor(m.name)}`}
              title={m.email}
            >
              {getInitials(m.name)}
            </div>
          ))}
          {currentMembers.length > 3 && (
            <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[8px] font-bold text-gray-500">
              +{currentMembers.length - 3}
            </div>
          )}
          {currentMembers.length === 0 && (
            <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-50 flex items-center justify-center text-gray-400">
              <Plus size={10} />
            </div>
          )}
        </div>
        <span className="text-[13px] font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
          {currentMembers.length > 0 
            ? (showEmails ? `${currentMembers.length} members` : `${currentMembers.length} members`) 
            : 'Add members'}
        </span>
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
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                        isMember ? 'bg-indigo-600' : 'bg-gray-300'
                      }`}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-900">{user.name}</span>
                        <span className="text-[10px] text-gray-500">{user.email}</span>
                      </div>
                    </div>
                    {isMember && <Check size={14} className="text-indigo-600" />}
                    {!isMember && <Plus size={14} className="text-gray-300 group-hover:text-gray-400" />}
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
