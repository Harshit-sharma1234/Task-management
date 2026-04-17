'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getProjectLogs } from '@/app/dashboard/[workspace]/logging/actions';
import { Shimmer } from '@/components/ui/Skeleton';

interface ProjectActivityPanelProps {
  projectId: string;
  userRole?: string | null;
}

export const ProjectActivityPanel = memo(({ projectId, userRole }: ProjectActivityPanelProps) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const fetchLogs = async () => {
    setIsLoading(true);
    const res = await getProjectLogs(projectId);
    if (!res.error) {
      setLogs(res.data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel(`project_activity_${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_logs', filter: `project_id=eq.${projectId}` },
        () => fetchLogs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!(userRole === 'Admin' || userRole?.toLowerCase() === 'admin')) {
    return null;
  }

  return (
    <div className="space-y-4 pt-2 border-t border-gray-50">
      <div 
        className="flex items-center justify-between cursor-pointer group/header"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown size={14} className="text-gray-400 group-hover:header:text-indigo-500 transition-colors" />
          ) : (
            <ChevronRight size={14} className="text-gray-400 group-hover:header:text-indigo-500 transition-colors" />
          )}
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:header:text-gray-600 transition-colors">
            Activity
          </h3>
        </div>
        {isOpen && (
          <span className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 cursor-pointer uppercase tracking-tight">Full feed</span>
        )}
      </div>
      
      {isOpen && (
        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Shimmer className="w-7 h-7 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Shimmer className="h-4 w-40 rounded-sm" />
                    <Shimmer className="h-3 w-24 rounded-sm" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center gap-3 text-xs text-gray-400 border-l-2 border-gray-100 pl-4 ml-2">
              <span className="text-[11px] font-medium">No activity yet</span>
            </div>
          ) : (
            logs.slice(0, 10).map((log) => (
              <div key={log.id} className="flex flex-col gap-0.5 border-l-2 border-gray-100 pl-4 ml-2 hover:border-indigo-200 transition-colors group mb-3 last:mb-0">
                <p className="text-[11px] text-gray-600 leading-tight">
                  <span className="font-semibold text-gray-900 mr-1">{log.users?.email || 'Unknown'}</span>
                  {log.description}
                </p>
                <span className="text-[9px] text-gray-400 uppercase font-bold tracking-tighter">
                  {formatDate(log.created_at)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
});

ProjectActivityPanel.displayName = 'ProjectActivityPanel';
