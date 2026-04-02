'use client';

import { useState } from 'react';
import { Plus, Filter, SlidersHorizontal } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { clsx } from 'clsx';

const AddIssueModal = dynamic(() => import('./AddIssueModal').then(mod => mod.AddIssueModal), {
  ssr: false,
});

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
  activeFilter?: string;
}

export function IssuesHeader({ totalIssues, projects, users, activeFilter = 'all' }: IssuesHeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filters = [
    { id: 'all', label: 'All issues' },
    { id: 'active', label: 'Active' },
    { id: 'backlog', label: 'Backlog' },
  ];

  return (
    <>
      <div className="flex flex-col bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="h-16 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {filters.map((filter) => (
                <Link
                  key={filter.id}
                  href={`/dashboard/issues?filter=${filter.id}`}
                  className={clsx(
                    "text-xs font-semibold px-3 py-1.5 rounded-md transition-all duration-200",
                    activeFilter === filter.id 
                      ? "bg-gray-100 text-gray-900 shadow-sm" 
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  )}
                >
                  {filter.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus size={16} />
              <span>New Issue</span>
            </button>
            <div className="ml-2 flex items-center gap-1 border-l border-gray-100 pl-3">
              <div className="p-1.5 hover:bg-gray-100 rounded-md cursor-pointer text-gray-500 transition-colors">
                <Filter size={16} />
              </div>
              <div className="p-1.5 hover:bg-gray-100 rounded-md cursor-pointer text-gray-500 transition-colors">
                <SlidersHorizontal size={16} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <AddIssueModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          projects={projects}
          users={users}
        />
      )}
    </>
  );
}
