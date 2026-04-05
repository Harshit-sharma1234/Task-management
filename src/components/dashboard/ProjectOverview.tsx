'use client';

import { useState, useTransition } from 'react';
import { Building2, Plus, Check, X } from 'lucide-react';
import { PrioritySelector } from './PrioritySelector';
import { LeadSelector } from './LeadSelector';
import { TargetDateSelector } from './TargetDateSelector';
import { StatusSelector } from './StatusSelector';
import { MemberSelector } from './MemberSelector';
import { updateProjectDescription, addProjectResource, deleteProjectResource } from '@/app/dashboard/actions';
import { toast } from 'sonner';
import { ExternalLink, Trash2 } from 'lucide-react';


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
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [isPending, startTransition] = useTransition();

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
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="text-gray-400 font-medium tracking-tight">Properties</span>
            <StatusSelector projectId={project.id} currentStatus={project.status} />
            <PrioritySelector projectId={project.id} currentPriority={project.priority} showLabel={true} />
            <LeadSelector projectId={project.id} currentLeadId={project.lead_id} users={users} showEmail={true} />
            <MemberSelector projectId={project.id} users={users} currentMemberIds={currentMemberIds} showEmails={true} />
            <TargetDateSelector projectId={project.id} currentTargetDate={project.start_date || null} />
          </div>
        </div>
      </div>

      {/* Resources Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Resources</h3>
        </div>
        
        {/* Resource List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {resources.map((resource) => (
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
                    startTransition(async () => {
                      await deleteProjectResource(resource.id, project.id);
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
                  startTransition(async () => {
                    const res = await addProjectResource(project.id, resourceTitle, resourceUrl);
                    if (res?.error) toast.error(res.error);
                    else {
                      setIsAddingResource(false);
                      setResourceTitle('');
                      setResourceUrl('');
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
            <p className={`text-gray-600 text-sm leading-relaxed ${!project.description ? 'text-gray-400 italic' : ''}`}>
              {project.description || "Add description..."}
            </p>
          </div>
        )}
      </div>


    </div>
  );
}
