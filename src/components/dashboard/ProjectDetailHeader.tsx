'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronRight, Layout, Info, Link as LinkIcon, Check } from 'lucide-react';
import Link from 'next/link';

interface ProjectDetailHeaderProps {
  projectName: string;
  projectId: string;
}

export function ProjectDetailHeader({ projectName, projectId }: ProjectDetailHeaderProps) {
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') || 'overview').toLowerCase();

  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { name: 'Overview', icon: Layout, id: 'overview' },
    { name: 'Issues', icon: Info, id: 'issues' },
  ];

  return (
    <div className="border-b border-gray-100 bg-white pl-8 pr-4 pt-4 pb-0 flex flex-col gap-4">
      {/* Top row: Breadcrumbs & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/dashboard/projects" className="hover:text-indigo-600 transition-colors">Projects</Link>
          <ChevronRight size={14} className="text-gray-300" />
          <span className="text-gray-900 font-medium">{projectName}</span>
        </div>

        <button 
          onClick={copyLink}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-all group relative"
          title="Copy link"
        >
          {copied ? (
            <div className="flex items-center gap-1.5 text-indigo-600 animate-in fade-in zoom-in duration-200">
              <Check size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Copied</span>
            </div>
          ) : (
            <>
              <LinkIcon size={14} className="group-hover:rotate-12 transition-transform" />
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">Copy Link</span>
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 text-[#1A1F2C]">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/dashboard/projects/${projectId}?tab=${tab.id}`}
            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
