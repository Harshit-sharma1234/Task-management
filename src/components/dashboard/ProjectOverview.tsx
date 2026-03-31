'use client';

import { useState, useTransition } from 'react';
import { Building2, Plus, Check, X } from 'lucide-react';
import { PrioritySelector } from './PrioritySelector';
import { LeadSelector } from './LeadSelector';
import { TargetDateSelector } from './TargetDateSelector';
import { StatusSelector } from './StatusSelector';
import { MemberSelector } from './MemberSelector';
import { updateProjectDescription } from '@/app/dashboard/actions';

interface ProjectOverviewProps {
  project: any;
  users: any[];
  currentMemberIds: string[];
  currentUser?: any;
}

export function ProjectOverview({ project, users, currentMemberIds, currentUser }: ProjectOverviewProps) {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState(project.description || '');
  const [isPending, startTransition] = useTransition();

  const handleSaveDescription = () => {
    if (descriptionValue === project.description) {
      setIsEditingDescription(false);
      return;
    }

    startTransition(async () => {
      const res = await updateProjectDescription(project.id, descriptionValue);
      if (res.error) {
        alert(res.error);
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
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Resources</h3>
        <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors group">
          <Plus size={16} className="text-gray-400 group-hover:text-gray-600" />
          Add document or link...
        </button>
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

      {/* Milestones */}
      <div className="space-y-4 pt-4">
        <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors group">
          <Plus size={16} className="text-gray-400 group-hover:text-gray-600" />
          Milestone
        </button>
      </div>
    </div>
  );
}
