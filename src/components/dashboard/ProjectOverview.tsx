'use client';

import { useState } from 'react';
import { Building2, MessageCircle, Plus, FileText, Milestone, ChevronRight, SquarePen, MessageSquare, SmilePlus, Activity } from 'lucide-react';
import { PrioritySelector } from './PrioritySelector';
import { LeadSelector } from './LeadSelector';
import { TargetDateSelector } from './TargetDateSelector';
import { StatusSelector } from './StatusSelector';
import { MemberSelector } from './MemberSelector';
import { ProjectUpdateModal } from './ProjectUpdateModal';

interface ProjectOverviewProps {
  project: any;
  users: any[];
  currentMemberIds: string[];
  currentUser?: any;
}

export function ProjectOverview({ project, users, currentMemberIds, currentUser }: ProjectOverviewProps) {
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [latestUpdate, setLatestUpdate] = useState<{ content: string, status: string, timestamp: string } | null>(null);

  const handlePostUpdate = (content: string, status: string) => {
    setLatestUpdate({
      content,
      status,
      timestamp: 'just now'
    });
  };

  const getGradient = (email: string) => {
    const gradients = [
        'from-[#ff6b6b] to-[#ee0979]',
        'from-[#4facfe] to-[#00f2fe]',
        'from-[#6a11cb] to-[#2575fc]',
        'from-[#f2994a] to-[#f2c94c]',
        'from-[#00c6fb] to-[#005bea]',
        'from-[#8e2de2] to-[#4a00e0]',
        'from-[#f093fb] to-[#f5576c]'
    ];
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
        hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
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
            <button className="text-gray-400 text-sm hover:text-gray-600 text-left transition-colors">
              Add a short summary...
            </button>
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
      
      {/* Project Status / Update Card */}
      {latestUpdate ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Latest update</h3>
            <button 
              onClick={() => setIsUpdateModalOpen(true)}
              className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              <SquarePen size={14} />
              Update
            </button>
          </div>
          
          <div className="bg-[#1c1c1f] rounded-xl p-6 border border-[#2e2e32] shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#1c2b21] border border-[#223d2a] text-[#4ade80]">
                <Activity size={12} className="stroke-[3px]" />
                <span className="text-[10px] font-bold tracking-tight uppercase">On track</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full bg-linear-to-br ${getGradient(currentUser?.email || 'user@example.com')} flex items-center justify-center text-[9px] font-bold text-white shadow-sm ring-1 ring-white/10`}>
                  {(currentUser?.email?.[0] || 'U').toUpperCase()}
                </div>
                <span className="text-xs text-gray-400">{currentUser?.email}</span>
                <span className="text-[11px] text-gray-500">{latestUpdate.timestamp}</span>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-[15px] font-medium text-white leading-relaxed">
                {latestUpdate.content}
              </p>
            </div>
            
            <div className="flex items-center gap-4 pt-4 border-t border-white/5">
              <button className="text-gray-500 hover:text-gray-300 transition-colors">
                <MessageSquare size={16} />
              </button>
              <button className="text-gray-500 hover:text-gray-300 transition-colors">
                <SmilePlus size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div 
            onClick={() => setIsUpdateModalOpen(true)}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 text-gray-500">
              <FileText size={20} className="text-indigo-500" />
              <span className="group-hover:text-gray-900">Write first project update</span>
            </div>
          </div>
        </div>
      )}

      <ProjectUpdateModal 
        isOpen={isUpdateModalOpen} 
        onClose={() => setIsUpdateModalOpen(false)} 
        onPost={handlePostUpdate}
        projectName={project.project_name} 
      />

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
