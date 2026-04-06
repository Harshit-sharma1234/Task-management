'use client';

import { 
  ChevronDown
} from 'lucide-react';
import { ProjectProperties } from './ProjectProperties';
import { ProjectProgressPanel } from './ProjectProgressPanel';
import { ProjectActivityPanel } from './ProjectActivityPanel';
import { useState } from 'react';
import { clsx } from 'clsx';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface ProjectSidebarProps {
  project: any;
  users: any[];
  currentMemberIds: string[];
  userRole?: string | null;
}

export function ProjectSidebar({ project, users, currentMemberIds, userRole }: ProjectSidebarProps) {
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(true);

  return (
    <div className="p-6 space-y-8 border-l border-gray-100 h-full bg-[#fbfbfb] overflow-y-auto custom-scrollbar">
      {/* Optimized Properties Section */}
      <ProjectProperties 
        project={project}
        users={users}
        currentMemberIds={currentMemberIds}
        isOpen={isPropertiesOpen}
        onToggle={() => setIsPropertiesOpen(!isPropertiesOpen)}
      />

      {/* Optimized Progress Section */}
      <ProjectProgressPanel projectId={project.id} />

      {/* Optimized Activity Section */}
      <ProjectActivityPanel projectId={project.id} userRole={userRole} />
    </div>
  );
}
