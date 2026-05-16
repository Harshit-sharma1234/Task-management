'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Building2, Check, X, Pencil } from 'lucide-react';
import { updateProjectDescription } from '@/app/dashboard/actions';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';

const PrioritySelector = dynamic(() => import('./PrioritySelector').then(mod => mod.PrioritySelector), { ssr: false });
const LeadSelector = dynamic(() => import('./LeadSelector').then(mod => mod.LeadSelector), { ssr: false });
const TargetDateSelector = dynamic(() => import('./TargetDateSelector').then(mod => mod.TargetDateSelector), { ssr: false });
const StatusSelector = dynamic(() => import('./StatusSelector').then(mod => mod.StatusSelector), { ssr: false });
const MemberSelector = dynamic(() => import('./MemberSelector').then(mod => mod.MemberSelector), { ssr: false });
const ProjectResourcesPanel = dynamic(
  () => import('./ProjectResourcesPanel').then(mod => mod.ProjectResourcesPanel),
  {
    ssr: false,
    loading: () => <div className="h-28 w-full rounded-xl border border-gray-100 bg-gray-50/40 animate-pulse" />
  }
);


interface ProjectOverviewProps {
  project: any;
  users: any[];
  currentMemberIds: string[];
  currentUser?: any;
  resources: any[];
}

export function ProjectOverview({ project, users, currentMemberIds, currentUser, resources }: ProjectOverviewProps) {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState(project.description || '');
  const [nameValue, setNameValue] = useState(project.project_name);
  const [isPending, startTransition] = useTransition();
  const supabase = useMemo(() => createClient(), []);

  // Listen for header-triggered edit
  useEffect(() => {
    const handler = () => {
      setIsEditingDescription(true);
      setIsEditingName(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('trigger-project-edit', handler);
    return () => window.removeEventListener('trigger-project-edit', handler);
  }, []);

  // Realtime: project description updates (other users) -> update local description instantly.
  useEffect(() => {
    if (!project?.id) return;
    const channel = supabase
      .channel(`project_content_${project.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projects', filter: `id=eq.${project.id}` },
        (payload) => {
          const next = payload?.new as any;
          if (next) {
            if (!isEditingDescription && typeof next.description !== 'undefined') {
              setDescriptionValue(next.description || '');
            }
            if (!isEditingName && typeof next.project_name !== 'undefined') {
              setNameValue(next.project_name || '');
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [project?.id, supabase, isEditingDescription, isEditingName]);

  const handleSaveDescription = () => {
    if (descriptionValue === project.description) {
      setIsEditingDescription(false);
      return;
    }

    startTransition(async () => {
      const res = await updateProjectDescription(project.id, descriptionValue);
      if (res.error) {
        toast.error(res.error);
      } else {
        setIsEditingDescription(false);
      }
    });
  };

  const handleSaveName = () => {
    if (!nameValue.trim()) {
      toast.error("Project name cannot be empty");
      return;
    }
    if (nameValue === project.project_name) {
      setIsEditingName(false);
      return;
    }

    startTransition(async () => {
      const { updateProjectName } = await import('@/app/dashboard/actions');
      const res = await updateProjectName(project.id, nameValue);
      if (res.error) {
        toast.error(res.error);
      } else {
        setIsEditingName(false);
      }
    });
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-8 sm:space-y-12 bg-white">
      {/* Title Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100 shrink-0">
            <Building2 className="text-indigo-600" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  autoFocus
                  className="text-xl sm:text-3xl font-bold text-gray-900 tracking-tight bg-gray-50 border-b-2 border-indigo-500 outline-none w-full px-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') {
                      setNameValue(project.project_name);
                      setIsEditingName(false);
                    }
                  }}
                />
                <button onClick={handleSaveName} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md">
                  <Check size={20} />
                </button>
                <button onClick={() => {
                  setNameValue(project.project_name);
                  setIsEditingName(false);
                }} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-md">
                  <X size={20} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between group">
                <h1
                  className="text-xl sm:text-3xl font-bold text-gray-900 tracking-tight cursor-text truncate"
                  onClick={() => setIsEditingName(true)}
                >
                  {nameValue}
                </h1>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1.5 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all shrink-0"
                >
                  <Pencil size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Horizontal Properties Row */}
        <div className="pt-4 border-t border-gray-100 relative z-[1] focus-within:z-[80] transition-all duration-200">
          {/* "Properties" label — shown inline on sm+, as its own row on mobile */}
          <span className="sm:hidden text-[11px] text-gray-400 font-bold uppercase tracking-widest block mb-2">Properties</span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-gray-500">
            <span className="hidden sm:inline text-gray-400 font-medium tracking-tight mr-1">Properties</span>
            <StatusSelector projectId={project.id} currentStatus={project.status} />
            <PrioritySelector projectId={project.id} currentPriority={project.priority} showLabel={true} />
            <LeadSelector projectId={project.id} currentLeadId={project.lead_id} users={users} showEmail={false} />
            <MemberSelector projectId={project.id} users={users} currentMemberIds={currentMemberIds} showEmails={true} />
            <TargetDateSelector projectId={project.id} currentTargetDate={project.target_date || project.start_date || null} />
          </div>
        </div>
      </div>

      <ProjectResourcesPanel projectId={project.id} resources={resources} />


      {/* Description */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</h3>
          {isEditingDescription ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setDescriptionValue(project.description || '');
                  setIsEditingDescription(false);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isPending}
              >
                <X size={16} />
              </button>
              <button
                onClick={handleSaveDescription}
                className="p-1 text-indigo-600 hover:text-indigo-700 transition-colors"
                disabled={isPending}
              >
                <Check size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingDescription(true)}
              className="p-1.5 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
            >
              <Pencil size={12} />
            </button>
          )}
        </div>

        {isEditingDescription ? (
          <textarea
            value={descriptionValue}
            onChange={(e) => setDescriptionValue(e.target.value)}
            placeholder="Add description..."
            autoFocus
            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all min-h-[120px] resize-none"
            disabled={isPending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSaveDescription();
              if (e.key === 'Escape') {
                setDescriptionValue(project.description || '');
                setIsEditingDescription(false);
              }
            }}
          />
        ) : (
          <div
            onClick={() => setIsEditingDescription(true)}
            className="group cursor-text"
          >
            <p className={`text-gray-600 text-sm leading-relaxed ${!descriptionValue ? 'text-gray-400 italic' : ''}`}>
              {descriptionValue || "Add description..."}
            </p>
          </div>
        )}
      </div>


    </div>
  );
}
