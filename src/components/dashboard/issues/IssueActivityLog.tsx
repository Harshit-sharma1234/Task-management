'use client';

import { UserAvatar } from '@/components/ui/UserAvatar';
import { ChevronDown, History } from 'lucide-react';
import { useState } from 'react';

interface LogEntry {
  id: string;
  message: string;
  action_type: string;
  created_at: string;
  users: {
    id?: string;
    name: string;
    avatar_url?: string | null;
  };
}

interface IssueActivityLogProps {
  logs: LogEntry[];
}

export function IssueActivityLog({ logs }: IssueActivityLogProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (logs.length === 0) return null;

  return (
    <div className="border border-gray-100 rounded-xl bg-white shadow-sm overflow-hidden">
      <div 
        className="px-3 py-2.5 flex items-center justify-between text-xs font-semibold text-gray-700 bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <History size={14} className="text-gray-400" />
          <span>Recent Activity</span>
        </div>
        <ChevronDown 
          size={12} 
          className={`text-gray-400 transition-transform ${isOpen ? '' : '-rotate-90'}`} 
        />
      </div>

      {isOpen && (
        <div className="p-3 max-h-[400px] overflow-y-auto no-scrollbar space-y-4">
          {logs.slice().reverse().map((log) => (
            <div key={log.id} className="flex gap-2.5">
              <div className="mt-0.5 shrink-0">
                <UserAvatar
                  name={log.users?.name || 'User'}
                  avatarUrl={log.users?.avatar_url}
                  size="xs"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-gray-700 leading-tight">
                  <span className="font-bold">{log.users?.name}</span> {log.message}
                </p>
                <p className="text-[9px] text-gray-400 font-medium mt-1">
                  {new Date(log.created_at).toLocaleString('en-IN', {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                    hour12: true, timeZone: 'Asia/Kolkata'
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
