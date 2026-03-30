'use client';

import { Bell, Inbox, AtSign, UserCheck, CheckCircle2 } from 'lucide-react';

interface InboxSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  counts: {
    all: number;
    unread: number;
    mentions: number;
    assigned: number;
  };
  onMarkAllRead: () => void;
}

export function InboxSidebar({ activeTab, setActiveTab, counts, onMarkAllRead }: InboxSidebarProps) {
  const tabs = [
    { id: 'all', label: 'All', icon: Inbox, count: counts.all },
    { id: 'unread', label: 'Unread', icon: Bell, count: counts.unread },
    { id: 'mentions', label: 'Mentions', icon: AtSign, count: counts.mentions },
    { id: 'assigned', label: 'Assigned to me', icon: UserCheck, count: counts.assigned },
  ];

  return (
    <div className="w-64 border-r border-gray-100 flex flex-col bg-gray-50/50 h-full">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Inbox className="text-indigo-600" size={20} />
          Inbox
        </h1>

        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-indigo-600 shadow-sm border border-gray-100'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </div>
              {tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-gray-100">
        <button
          onClick={onMarkAllRead}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-gray-100 hover:shadow-sm"
        >
          <CheckCircle2 size={14} />
          <span>Mark all as read</span>
        </button>
      </div>
    </div>
  );
}
