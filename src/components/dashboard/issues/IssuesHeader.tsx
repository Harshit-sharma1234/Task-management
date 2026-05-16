'use client';

import { useState } from 'react';
import { Plus, Filter, SlidersHorizontal } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { DisplaySettings } from '@/lib/utils/issue-display-utils';
import dynamic from 'next/dynamic';

const DisplayOptions = dynamic(() => import('./DisplayOptions').then(mod => mod.DisplayOptions), {
  ssr: false,
});

interface IssuesHeaderProps {
  totalIssues: number;
  activeFilter?: string;
  onFilterChange: (filter: string) => void;
  assigneeFilter?: string;
  onAssigneeFilterChange: (assigneeId: string) => void;
  users: any[];
  onOpenModal: () => void;
  displaySettings: DisplaySettings;
  onDisplaySettingsChange: (settings: DisplaySettings) => void;
  hideCreateButton?: boolean;
}

import { UserAvatar } from '@/components/ui/UserAvatar';
import { Search, ChevronDown, User as UserIcon, X } from 'lucide-react';

export function IssuesHeader({ 
  totalIssues, 
  activeFilter = 'all', 
  onFilterChange, 
  assigneeFilter = 'all',
  onAssigneeFilterChange,
  users,
  onOpenModal,
  displaySettings,
  onDisplaySettingsChange,
  hideCreateButton = false
}: IssuesHeaderProps) {
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');

  const selectedUser = users?.find(u => u.id === assigneeFilter);
  
  const statusFilters = [
    { id: 'all', label: 'All issues', icon: <Filter size={14} /> },
    { id: 'active', label: 'Active', icon: <div className="w-2 h-2 rounded-full bg-blue-500" /> },
    { id: 'backlog', label: 'Backlog', icon: <div className="w-2 h-2 rounded-full bg-gray-400" /> },
  ];

  const myTaskFilters = [
    { id: 'urgent', label: 'My Urgent', icon: <div className="w-2 h-2 rounded-full bg-red-500" /> },
    { id: 'in_progress', label: 'My In Progress', icon: <div className="w-2 h-2 rounded-full bg-yellow-500" /> },
    { id: 'completed', label: 'My Completed', icon: <div className="w-2 h-2 rounded-full bg-green-500" /> },
  ];

  const filteredUsers = (users || []).filter(u => 
    u.name?.toLowerCase().includes(filterSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(filterSearch.toLowerCase())
  );

  return (
    <>
      <div className="flex flex-col bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="h-16 flex items-center justify-between px-8">
          <div className="flex items-center gap-2">
            {/* Unified Filter Menu */}
            <div className="relative">
              <button
                onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                className={twMerge(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200",
                  (activeFilter !== 'all' || assigneeFilter !== 'all')
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                <Filter size={14} className={activeFilter !== 'all' || assigneeFilter !== 'all' ? "text-indigo-600" : "text-gray-400"} />
                <span>Filter</span>
                {(activeFilter !== 'all' || assigneeFilter !== 'all') && (
                  <span className="flex items-center justify-center w-4 h-4 bg-indigo-600 text-white text-[10px] rounded-full">
                    {[activeFilter !== 'all', assigneeFilter !== 'all'].filter(Boolean).length}
                  </span>
                )}
                <ChevronDown size={14} className={twMerge("transition-transform", isFilterMenuOpen && "rotate-180")} />
              </button>

              {isFilterMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterMenuOpen(false)} />
                  <div className="absolute left-0 mt-2 w-72 bg-white border border-gray-100 shadow-2xl rounded-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-gray-50 flex items-center gap-2 bg-gray-50/50">
                      <Search size={14} className="text-gray-400" />
                      <input
                        type="text"
                        placeholder="Add Filter..."
                        value={filterSearch}
                        onChange={(e) => setFilterSearch(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-xs w-full placeholder:text-gray-400 font-medium"
                      />
                    </div>

                    <div className="max-h-[450px] overflow-y-auto p-1.5 scrollbar-thin flex flex-col gap-1">
                      {/* Status Section */}
                      {!filterSearch && (
                        <div className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</div>
                      )}
                      {statusFilters.filter(f => f.label.toLowerCase().includes(filterSearch.toLowerCase())).map((f) => (
                        <button
                          key={f.id}
                          onClick={() => {
                            onFilterChange(f.id);
                            setIsFilterMenuOpen(false);
                          }}
                          className={twMerge(
                            "w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium transition-colors",
                            activeFilter === f.id ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          )}
                        >
                          <div className="w-5 flex justify-center">{f.icon}</div>
                          <span>{f.label}</span>
                          {activeFilter === f.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                        </button>
                      ))}

                      {/* My Tasks Section */}
                      {!filterSearch && (
                        <div className="px-2 py-1.5 mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">My Tasks</div>
                      )}
                      {myTaskFilters.filter(f => f.label.toLowerCase().includes(filterSearch.toLowerCase())).map((f) => (
                        <button
                          key={f.id}
                          onClick={() => {
                            onFilterChange(f.id);
                            setIsFilterMenuOpen(false);
                          }}
                          className={twMerge(
                            "w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium transition-colors",
                            activeFilter === f.id ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          )}
                        >
                          <div className="w-5 flex justify-center">{f.icon}</div>
                          <span>{f.label}</span>
                          {activeFilter === f.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                        </button>
                      ))}

                      {/* Assignee Section */}
                      {!filterSearch && (
                        <div className="px-2 py-1.5 mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-t border-gray-50 pt-3">Assignee</div>
                      )}
                      <button
                        onClick={() => {
                          onAssigneeFilterChange('all');
                          setIsFilterMenuOpen(false);
                        }}
                        className={twMerge(
                          "w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium transition-colors",
                          assigneeFilter === 'all' ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        <div className="w-5 flex justify-center"><UserIcon size={14} className="text-gray-400" /></div>
                        <span>All Assignees</span>
                      </button>
                      
                      {filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => {
                            onAssigneeFilterChange(user.id);
                            setIsFilterMenuOpen(false);
                          }}
                          className={twMerge(
                            "w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium transition-colors",
                            assigneeFilter === user.id ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          )}
                        >
                          <div className="w-5 flex justify-center">
                            <UserAvatar name={user.name} avatarUrl={user.avatar_url} size="xs" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="truncate">{user.name}</span>
                          </div>
                          {assigneeFilter === user.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                        </button>
                      ))}
                    </div>

                    {(activeFilter !== 'all' || assigneeFilter !== 'all') && (
                      <div className="p-2 border-t border-gray-50 bg-gray-50/30">
                        <button
                          onClick={() => {
                            onFilterChange('all');
                            onAssigneeFilterChange('all');
                            setIsFilterMenuOpen(false);
                          }}
                          className="w-full py-1.5 text-center text-[10px] font-bold text-gray-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                        >
                          Clear All Filters
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Quick badges for active filters */}
            <div className="flex items-center gap-1.5 ml-2">
              {activeFilter !== 'all' && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold border border-gray-200">
                  <span>{activeFilter.replace('_', ' ')}</span>
                  <button onClick={() => onFilterChange('all')} className="hover:text-red-500"><X size={10} /></button>
                </div>
              )}
              {assigneeFilter !== 'all' && selectedUser && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold border border-indigo-100">
                  <span>{selectedUser.name}</span>
                  <button onClick={() => onAssigneeFilterChange('all')} className="hover:text-red-500"><X size={10} /></button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
            <DisplayOptions 
              settings={displaySettings} 
              onChange={onDisplaySettingsChange} 
            />
            {!hideCreateButton && (
              <button 
                onClick={onOpenModal}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs sm:text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">New Issue</span>
                <span className="sm:hidden">New</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
