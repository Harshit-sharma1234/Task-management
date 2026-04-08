'use client';

import { useState } from 'react';
import { Plus, Filter, SlidersHorizontal } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

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
  onFilterChange: (filter: string) => void;
  onOpenModal: () => void;
}

export function IssuesHeader({ totalIssues, projects, users, activeFilter = 'all', onFilterChange, onOpenModal }: IssuesHeaderProps) {

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
                <button
                  key={filter.id}
                  onClick={() => onFilterChange(filter.id)}
                  className={twMerge(
                    "text-xs font-semibold px-3 py-1.5 rounded-md transition-all duration-200",
                    activeFilter === filter.id 
                      ? "bg-gray-100 text-gray-900 shadow-sm" 
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onOpenModal}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus size={16} />
              <span>New Issue</span>
            </button>
          </div>
        </div>
      </div>

    </>
  );
}
