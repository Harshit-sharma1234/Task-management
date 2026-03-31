'use client';

import { ChevronRight, Layout, MessageSquare, Info } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface ProjectDetailHeaderProps {
  projectName: string;
}

export function ProjectDetailHeader({ projectName }: ProjectDetailHeaderProps) {
  const [activeTab, setActiveTab ] = useState('Overview');

  const tabs = [
    { name: 'Overview', icon: Layout },
    { name: 'Issues', icon: Info },
  ];

  return (
    <div className="border-b border-gray-100 bg-white px-8 pt-4 pb-0 flex flex-col gap-4">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/projects" className="hover:text-indigo-600 transition-colors">Projects</Link>
        <ChevronRight size={14} className="text-gray-300" />
        <span className="text-gray-900 font-medium">{projectName}</span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(tab.name)}
            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === tab.name
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.name}
          </button>
        ))}
      </div>
    </div>
  );
}
