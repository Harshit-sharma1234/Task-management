'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { AddIssueModal } from './AddIssueModal';

interface Project {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

interface IssuesHeaderProps {
  totalIssues: number;
  projects: Project[];
  users: User[];
}

export function IssuesHeader({ totalIssues, projects, users }: IssuesHeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="h-16 flex items-center justify-between px-8 border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">All Issues</h1>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
              {totalIssues}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            <span>New Issue</span>
          </button>
        </div>
      </div>

      <AddIssueModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        projects={projects}
        users={users}
      />
    </>
  );
}
