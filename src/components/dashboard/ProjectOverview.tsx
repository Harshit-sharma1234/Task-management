'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { Building2, Check, X } from 'lucide-react';
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
  const [descriptionValue, setDescriptionValue] = useState(project.description || '');
  const [isPending, startTransition] = useTransition();
  const supabase = useMemo(() => createClient(), []);

  // Realtime: project description updates (other users) -> update local description instantly.
  useEffect(() => {
    if (!project?.id) return;
    const channel = supabase
      .channel(`project_description_${project.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projects', filter: `id=eq.${project.id}` },
        (payload) => {
          if (isEditingDescription) return;
          const next = payload?.new as any;
          if (next && typeof next.description !== 'undefined') {
            setDescriptionValue(next.description || '');
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [project?.id, supabase, isEditingDescription]);

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

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-12 bg-white">
      {/* Title Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
            <Building2 className="text-indigo-600" size={24} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{project.project_name}</h1>
          </div>
        </div>

        {/* Horizontal Properties Row */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-4 border-t border-gray-100 relative z-[1] focus-within:z-50 transition-all duration-200">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="text-gray-400 font-medium tracking-tight">Properties</span>
            <StatusSelector projectId={project.id} currentStatus={project.status} />
            <PrioritySelector projectId={project.id} currentPriority={project.priority} showLabel={true} />
            <LeadSelector projectId={project.id} currentLeadId={project.lead_id} users={users} showEmail={false} showName={true} hideAvatar={true} />
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
          {isEditingDescription && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsEditingDescription(false)}
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
          )}
        </div>
        
        {isEditingDescription ? (
          <textarea
            value={descriptionValue}
            onChange={(e) => setDescriptionValue(e.target.value)}
            onBlur={(e) => {
              // Only save if clicking outside the save button area
              // For simplicity, we'll rely on the buttons for now
            }}
            placeholder="Add description..."
            autoFocus
            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all min-h-[120px] resize-none"
            disabled={isPending}
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
