'use client';

import { useState } from 'react';
import { Plus, Filter, SlidersHorizontal } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { DisplaySettings } from '@/lib/utils/issue-display-utils';
import dynamic from 'next/dynamic';

const DisplayOptions = dynamic(() => import('./DisplayOptions').then(mod => mod.DisplayOptions), {
  ssr: false,
});

interface IssuesHeaderProps {
  totalIssues: number;
  activeFilter?: string;
  onFilterChange: (filter: string) => void;
  onOpenModal: () => void;
  displaySettings: DisplaySettings;
  onDisplaySettingsChange: (settings: DisplaySettings) => void;
  hideCreateButton?: boolean;
}

export function IssuesHeader({ 
  totalIssues, 
  activeFilter = 'all', 
  onFilterChange, 
  onOpenModal,
  displaySettings,
  onDisplaySettingsChange,
  hideCreateButton = false
}: IssuesHeaderProps) {

  const filters = [
    { id: 'all', label: 'All issues' },
    { id: 'active', label: 'Active' },
    { id: 'backlog', label: 'Backlog' },
    { id: 'urgent', label: 'My Urgent' },
    { id: 'in_progress', label: 'My In Progress' },
    { id: 'completed', label: 'My Completed' },
  ];

  return (
    <>
      <div className="flex flex-col bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="min-h-[4rem] flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-8 py-3 sm:py-0 gap-4">
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar -mx-2 px-2 lg:mx-0 lg:px-0">
            <div className="flex items-center gap-2 whitespace-nowrap">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => onFilterChange(filter.id)}
                  className={twMerge(
                    "text-[10px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-md transition-all duration-200",
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
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
            <DisplayOptions 
              settings={displaySettings} 
              onChange={onDisplaySettingsChange} 
            />
            {!hideCreateButton && (
              <button 
                onClick={onOpenModal}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs sm:text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">New Issue</span>
                <span className="sm:hidden">New</span>
              </button>
            )}
          </div>
        </div>
      </div>

    </>
  );
}
