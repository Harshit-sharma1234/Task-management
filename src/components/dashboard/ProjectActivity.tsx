'use client';

import { useState, useEffect, useTransition } from 'react';
import { 
  Users, 
  UserCheck, 
  AlertCircle, 
  Activity, 
  Calendar, 
  ChevronDown, 
  FileText,
  Clock
} from 'lucide-react';
import { getProjectLogs } from '@/app/dashboard/logging/actions';

interface ProjectActivityProps {
  projectId: string;
}

export function ProjectActivity({ projectId }: ProjectActivityProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadLogs() {
      const res = await getProjectLogs(projectId);
      if (!res.error) {
        setLogs(res.data || []);
      }
    }
    loadLogs();
  }, [projectId]);

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'member_add': return <Users size={14} className="text-gray-400" />;
      case 'lead_change': return <UserCheck size={14} className="text-gray-400" />;
      case 'priority_change': return <AlertCircle size={14} className="text-gray-400" />;
      case 'status_change': return <Activity size={14} className="text-gray-400" />;
      case 'target_date_change': return <Calendar size={14} className="text-gray-400" />;
      case 'description_change': return <FileText size={14} className="text-gray-400" />;
      default: return <Clock size={14} className="text-gray-400" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer group">
          <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">Activity</h3>
          <ChevronDown size={14} className="text-gray-400 group-hover:text-indigo-600" />
        </div>
        <button className="text-xs font-medium text-gray-400 hover:text-indigo-600 transition-colors">See all</button>
      </div>

      <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
        {logs.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-gray-400">No activity recorded yet.</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50/50 transition-colors group">
              <div className="mt-0.5 w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100 group-hover:border-indigo-100 group-hover:bg-indigo-50 transition-colors">
                {getActionIcon(log.action_type)}
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-sm text-gray-600 leading-relaxed">
                  <span className="font-medium text-gray-900 mr-1.5">{log.users?.name || log.users?.email || 'Unknown User'}</span>
                  {log.description}
                </p>
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  {formatDate(log.created_at)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
