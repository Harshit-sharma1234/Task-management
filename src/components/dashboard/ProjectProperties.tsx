'use client';

import React, { memo } from 'react';
import { ChevronDown } from 'lucide-react';
import { StatusSelector } from './StatusSelector';
import { PrioritySelector } from './PrioritySelector';
import { LeadSelector } from './LeadSelector';
import { MemberSelector } from './MemberSelector';
import { TargetDateSelector } from './TargetDateSelector';
import { updateProjectTargetDate } from '@/app/dashboard/actions';

interface ProjectPropertiesProps {
  project: any;
  users: any[];
  currentMemberIds: string[];
  isOpen: boolean;
  onToggle: () => void;
}

export const ProjectProperties = memo(({ 
  project, 
  users, 
  currentMemberIds, 
  isOpen, 
  onToggle 
}: ProjectPropertiesProps) => {
  // Common click handler for full-row trigger
  const handleRowClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const btn = e.currentTarget.querySelector('button');
    if (btn) btn.click();
  };

  return (
    <div className="border border-gray-100 rounded-xl bg-white shadow-sm pb-1">
      <div 
        className="px-3 py-2.5 flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 rounded-t-xl"
        onClick={onToggle}
      >
        <span>Properties</span>
        <ChevronDown 
          size={12} 
          className={`text-gray-400 transition-transform ${isOpen ? '' : '-rotate-90'}`} 
        />
      </div>
      
      {isOpen && (
        <div className="flex flex-col py-1">
          {/* Status */}
          <div className="px-1 py-0.5 group cursor-pointer" onClick={handleRowClick}>
            <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest min-w-[80px] shrink-0 group-hover:text-indigo-500 transition-colors">Status</span>
              <div className="flex-1 flex justify-end">
                <StatusSelector projectId={project.id} currentStatus={project.status} align="right" />
              </div>
            </div>
          </div>

          {/* Priority */}
          <div className="px-1 py-0.5 group cursor-pointer" onClick={handleRowClick}>
            <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest min-w-[80px] shrink-0 group-hover:text-indigo-500 transition-colors">Priority</span>
              <div className="flex-1 flex justify-end">
                <PrioritySelector projectId={project.id} currentPriority={project.priority} showLabel={true} align="right" />
              </div>
            </div>
          </div>

          {/* Lead */}
          <div className="px-1 py-0.5 group cursor-pointer" onClick={handleRowClick}>
            <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest min-w-[80px] shrink-0 group-hover:text-indigo-500 transition-colors">Lead</span>
              <div className="flex-1 flex justify-end">
                <LeadSelector projectId={project.id} currentLeadId={project.lead_id} users={users} showEmail={false} showName={true} hideAvatar={true} align="right" />
              </div>
            </div>
          </div>

          {/* Members */}
          <div className="px-1 py-0.5 group cursor-pointer" onClick={handleRowClick}>
            <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest min-w-[80px] shrink-0 group-hover:text-indigo-500 transition-colors">Members</span>
              <div className="flex-1 flex justify-end">
                <MemberSelector 
                  projectId={project.id} 
                  users={users} 
                  currentMemberIds={currentMemberIds} 
                  showEmails={true}
                  align="right"
                />
              </div>
            </div>
          </div>

          {/* Start Date */}
          <div className="px-1 py-0.5 group cursor-pointer" onClick={handleRowClick}>
            <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest min-w-[80px] shrink-0 group-hover:text-indigo-500 transition-colors">Start Date</span>
              <div className="flex-1 flex justify-end">
                <TargetDateSelector projectId={project.id} currentTargetDate={project.start_date || null} align="right" onUpdate={updateProjectTargetDate} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  // Only re-render if fundamental project data changes
  return (
    prev.project.status === next.project.status &&
    prev.project.priority === next.project.priority &&
    prev.project.lead_id === next.project.lead_id &&
    prev.project.start_date === next.project.start_date &&
    prev.isOpen === next.isOpen &&
    prev.currentMemberIds.length === next.currentMemberIds.length &&
    prev.currentMemberIds.every((id, idx) => id === next.currentMemberIds[idx])
  );
});

ProjectProperties.displayName = 'ProjectProperties';
