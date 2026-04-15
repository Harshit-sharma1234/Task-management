'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { addProjectResource, deleteProjectResource } from '@/app/dashboard/actions';
import { toast } from 'sonner';

interface ProjectResourcesPanelProps {
  projectId: string;
  resources: any[];
}

export function ProjectResourcesPanel({ projectId, resources }: ProjectResourcesPanelProps) {
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [currentResources, setCurrentResources] = useState<any[]>(resources || []);
  const [, startTransition] = useTransition();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    setCurrentResources(resources || []);
  }, [resources]);

  // Realtime: resources updates -> update list immediately.
  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`project_resources_${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_resources',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const ev = payload?.eventType;
          const newRow = payload?.new as any;
          const oldRow = payload?.old as any;

          if (ev === 'INSERT' && newRow?.id) {
            setCurrentResources((prev) => {
              if (prev.some((r) => r.id === newRow.id)) return prev;
              return [{ id: newRow.id, title: newRow.title, url: newRow.url }, ...prev];
            });
            return;
          }

          if (ev === 'UPDATE' && newRow?.id) {
            setCurrentResources((prev) =>
              prev.map((r) =>
                r.id === newRow.id ? { ...r, title: newRow.title, url: newRow.url } : r
              )
            );
            return;
          }

          if (ev === 'DELETE' && oldRow?.id) {
            setCurrentResources((prev) => prev.filter((r) => r.id !== oldRow.id));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [projectId, supabase]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Resources</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {currentResources.map((resource) => (
          <div
            key={resource.id}
            className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/30 hover:bg-gray-50 transition-all group/res"
          >
            <a
              href={resource.url.startsWith('http') ? resource.url : `https://${resource.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 overflow-hidden"
            >
              <div className="w-8 h-8 rounded bg-white flex items-center justify-center border border-gray-100 shrink-0 shadow-sm">
                <ExternalLink size={14} className="text-gray-400 group-hover/res:text-indigo-600 transition-colors" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-semibold text-gray-900 truncate">{resource.title}</span>
                <span className="text-[10px] text-gray-500 truncate">{resource.url}</span>
              </div>
            </a>
            <button
              onClick={() => {
                if (confirm('Delete this resource?')) {
                  const removed = resource;
                  setCurrentResources((prev) => prev.filter((r) => r.id !== removed.id));
                  startTransition(async () => {
                    const res = await deleteProjectResource(removed.id, projectId);
                    if (res?.error) {
                      toast.error(res.error);
                      setCurrentResources((prev) => [removed, ...prev]);
                    }
                  });
                }
              }}
              className="p-1.5 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover/res:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {isAddingResource ? (
        <div className="p-4 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Title (e.g. Design Spec)"
              className="bg-white border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={resourceTitle}
              onChange={(e) => setResourceTitle(e.target.value)}
            />
            <input
              type="text"
              placeholder="URL (e.g. figma.com/...)"
              className="bg-white border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={resourceUrl}
              onChange={(e) => setResourceUrl(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsAddingResource(false)}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!resourceTitle || !resourceUrl) return;
                const tempId = `temp-${Date.now()}`;
                const optimistic = {
                  id: tempId,
                  title: resourceTitle,
                  url: resourceUrl,
                };
                setCurrentResources((prev) => [optimistic, ...prev]);
                setIsAddingResource(false);
                setResourceTitle('');
                setResourceUrl('');

                startTransition(async () => {
                  const res = await addProjectResource(projectId, optimistic.title, optimistic.url);
                  if (res?.error) {
                    toast.error(res.error);
                    setCurrentResources((prev) => prev.filter((r) => r.id !== tempId));
                    return;
                  }

                  const real = res?.data;
                  if (real?.id) {
                    setCurrentResources((prev) =>
                      prev.map((r) => (r.id === tempId ? { ...r, id: real.id, ...real } : r))
                    );
                  }
                });
              }}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-sm"
            >
              Add Resource
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAddingResource(true)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors group px-1"
        >
          <Plus size={16} className="text-gray-400 group-hover:text-indigo-600" />
          Add document or link...
        </button>
      )}
    </div>
  );
}
