'use client';

import { Building2, MessageCircle, Plus, FileText, Milestone, ChevronRight } from 'lucide-react';
import { PrioritySelector } from './PrioritySelector';
import { LeadSelector } from './LeadSelector';
import { TargetDateSelector } from './TargetDateSelector';

interface ProjectOverviewProps {
  project: any;
  users: any[];
}

export function ProjectOverview({ project, users }: ProjectOverviewProps) {
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
            <button className="text-gray-400 text-sm hover:text-gray-600 text-left transition-colors">
              Add a short summary...
            </button>
          </div>
        </div>

        {/* Horizontal Properties Row */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="text-gray-400 font-medium tracking-tight">Properties</span>
            <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200/50 text-gray-600">
              <div className="w-2 h-2 rounded-full border border-gray-400"></div>
              <span className="text-xs">Backlog</span>
            </div>
            <PrioritySelector projectId={project.id} currentPriority={project.priority} />
            <LeadSelector projectId={project.id} currentLeadId={project.lead_id} users={users} />
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

      {/* Update Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer group">
        <div className="flex items-center gap-3 text-gray-500">
          <FileText size={20} className="text-indigo-500" />
          <span className="group-hover:text-gray-900">Write first project update</span>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</h3>
        <p className="text-gray-600 text-sm leading-relaxed">
          {project.description || "Add description..."}
        </p>
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
