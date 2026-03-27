'use client';

import { 
  BarChart2, 
  Users, 
  Calendar, 
  Tag, 
  Milestone, 
  TrendingUp, 
  Clock,
  Plus
} from 'lucide-react';
import { PrioritySelector } from './PrioritySelector';
import { LeadSelector } from './LeadSelector';
import { TargetDateSelector } from './TargetDateSelector';
import { MemberSelector } from './MemberSelector';

interface ProjectSidebarProps {
  project: any;
  users: any[];
  currentMemberIds: string[];
}

export function ProjectSidebar({ project, users, currentMemberIds }: ProjectSidebarProps) {
  return (
    <div className="p-6 space-y-8 border-l border-gray-100 h-full bg-[#fbfbfb]">
      {/* Properties Panel */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            Properties
          </h3>
          <Plus size={14} className="text-gray-400 cursor-pointer hover:text-gray-600" />
        </div>
        
        <div className="grid grid-cols-[100px_1fr] gap-y-4 items-center text-sm">
          <span className="text-gray-400 font-medium">Status</span>
          <div className="flex items-center gap-2 text-gray-700">
            <div className="w-3.5 h-3.5 rounded-full border border-dashed border-gray-300"></div>
            <span className="font-medium text-gray-600 text-[13px]">Backlog</span>
          </div>

          <span className="text-gray-400 font-medium">Priority</span>
          <div className="w-full">
            <PrioritySelector projectId={project.id} currentPriority={project.priority} />
          </div>

          <span className="text-gray-400 font-medium">Lead</span>
          <div className="w-full">
            <LeadSelector projectId={project.id} currentLeadId={project.lead_id} users={users} />
          </div>

          <span className="text-gray-400 font-medium">Members</span>
          <MemberSelector 
            projectId={project.id} 
            users={users} 
            currentMemberIds={currentMemberIds} 
          />

          <span className="text-gray-400 font-medium">Dates</span>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
               <span className="text-[11px] text-gray-400 uppercase w-10">Start</span>
               <TargetDateSelector projectId={project.id} currentTargetDate={project.start_date || null} />
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[11px] text-gray-400 uppercase w-10">Target</span>
               <div className="flex items-center gap-1.5 text-gray-400 cursor-pointer hover:text-gray-600 px-2 py-1 rounded bg-white border border-gray-100/50">
                  <Calendar size={12} />
                  <span className="text-xs">Add target...</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Milestones Panel */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            Milestones
          </h3>
          <Plus size={14} className="text-gray-400 cursor-pointer hover:text-gray-600" />
        </div>
        <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
          Add milestones to organize work within your project. <span className="text-indigo-500 cursor-pointer hover:underline">Learn more</span>
        </p>
      </div>

      {/* Progress Panel */}
      <div className="space-y-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Progress
          </h3>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-0.5">
               <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                 <div className="w-1.5 h-1.5 bg-gray-300 rounded-sm"></div>
                 <span>Scope</span>
               </div>
               <span className="text-xl font-bold text-gray-900 tracking-tight">0</span>
             </div>
             <div className="space-y-0.5">
               <div className="flex items-center gap-2 text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                 <div className="w-1.5 h-1.5 bg-indigo-500 rounded-sm"></div>
                 <span>Done</span>
               </div>
               <span className="text-xl font-bold text-gray-900 tracking-tight">0</span>
             </div>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 py-1 text-[11px] font-bold bg-indigo-50 text-indigo-600 rounded border border-indigo-100 hover:bg-indigo-100/50 transition-colors">Assignees</button>
            <button className="flex-1 py-1 text-[11px] font-bold text-gray-400 rounded border border-transparent hover:bg-gray-50 transition-colors">Labels</button>
          </div>
        </div>
      </div>

      {/* Activity Panel */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Activity
          </h3>
          <span className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 cursor-pointer uppercase tracking-tight">Full feed</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 border-l-2 border-gray-100 pl-4 ml-2">
          <span className="text-[11px] font-medium text-gray-600">Project created · Just now</span>
        </div>
      </div>
    </div>
  );
}
