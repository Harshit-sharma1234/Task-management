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
}

export function MemberSelector({ projectId, users, currentMemberIds }: MemberSelectorProps) {
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
      await toggleProjectMember(projectId, userId);
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-gray-400 hover:text-gray-700 transition-colors py-1 group"
      >
        <Users size={14} className="group-hover:text-indigo-600 transition-colors" />
        <span className="text-[13px] font-medium group-hover:text-gray-900 transition-colors">
          {currentMembers.length > 0 ? `${currentMembers.length} members` : 'Add members'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
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
                    onClick={() => handleToggle(user.id)}
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
