'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  LayoutList, 
  LayoutGrid, 
  ChevronDown, 
  ArrowUpDown, 
  Settings2,
  Check,
  SlidersHorizontal
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { DisplaySettings, GroupBy, SortBy } from '@/lib/utils/issue-display-utils';

interface DisplayOptionsProps {
  settings: DisplaySettings;
  onChange: (settings: DisplaySettings) => void;
}

export function DisplayOptions({ settings, onChange }: DisplayOptionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleProperty = (prop: string) => {
    const newProps = settings.showProperties.includes(prop)
      ? settings.showProperties.filter(p => p !== prop)
      : [...settings.showProperties, prop];
    onChange({ ...settings, showProperties: newProps });
  };

  const properties = [
    { id: 'id', label: 'ID' },
    { id: 'status', label: 'Status' },
    { id: 'assignee', label: 'Assignee' },
    { id: 'priority', label: 'Priority' },
    { id: 'project', label: 'Project' },
    { id: 'created', label: 'Created' },
  ];

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={twMerge(
          "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 border border-gray-100",
          isOpen ? "bg-gray-100 text-gray-900 border-gray-200 shadow-sm" : "bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        )}
      >
        <SlidersHorizontal size={14} />
        <span>Display</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
          {/* View Toggles */}
          <div className="p-1 px-3 mt-3 border-b border-gray-50 pb-3">
             <div className="flex bg-gray-50 p-1 rounded-lg">
                <button 
                  onClick={() => onChange({ ...settings, viewMode: 'list' })}
                  className={twMerge(
                    "flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-md transition-all",
                    settings.viewMode === 'list' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <LayoutList size={14} />
                  List
                </button>
                <button 
                  onClick={() => onChange({ ...settings, viewMode: 'board' })}
                  className={twMerge(
                    "flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-md transition-all",
                    settings.viewMode === 'board' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <LayoutGrid size={14} />
                  Board
                </button>
             </div>
          </div>

          {/* Grouping / Sorting */}
          <div className="p-4 space-y-4 border-b border-gray-50">
             <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Grouping</span>
                <select 
                  value={settings.groupBy}
                  onChange={(e) => onChange({ ...settings, groupBy: e.target.value as GroupBy })}
                  className="text-xs font-semibold text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="none">No grouping</option>
                  <option value="status">Status</option>
                  <option value="project">Project</option>
                  <option value="priority">Priority</option>
                  <option value="assignee">Assignee</option>
                </select>
             </div>

             <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ordering</span>
                <div className="flex items-center gap-2">
                   <ArrowUpDown size={12} className="text-gray-400" />
                   <select 
                     value={settings.sortBy}
                     onChange={(e) => onChange({ ...settings, sortBy: e.target.value as SortBy })}
                     className="text-xs font-semibold text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                   >
                     <option value="created_at">Created at</option>
                     <option value="priority">Priority</option>
                     <option value="status">Status</option>
                   </select>
                </div>
             </div>
          </div>

          {/* Property Chips */}
          <div className="p-4">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-3">Display properties</span>
            <div className="flex flex-wrap gap-1.5">
              {properties.map((prop) => {
                const isActive = settings.showProperties.includes(prop.id);
                return (
                  <button
                    key={prop.id}
                    onClick={() => toggleProperty(prop.id)}
                    className={twMerge(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border",
                      isActive 
                        ? "bg-indigo-50 text-indigo-700 border-indigo-100" 
                        : "bg-gray-50 text-gray-500 border-gray-100 hover:border-gray-200"
                    )}
                  >
                    {prop.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 bg-gray-50/50 flex items-center justify-between border-t border-gray-50">
              <button 
                onClick={() => onChange({ viewMode: 'list', groupBy: 'status', sortBy: 'created_at', showProperties: ['id', 'status', 'assignee', 'priority'] })}
                className="text-[10px] font-bold text-gray-400 hover:text-indigo-600 uppercase tracking-wider transition-colors"
              >
                Reset
              </button>
              <button className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider transition-colors">
                Save as default
              </button>
          </div>
        </div>
      )}
    </div>
  );
}
