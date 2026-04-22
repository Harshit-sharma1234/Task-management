'use client';

import { useState, useTransition } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { ChevronRight, Layout, Info, Link as LinkIcon, Check, Plus } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useProjectTransition } from '@/lib/contexts/ProjectTransitionContext';

const AddIssueModal = dynamic(() => import('./issues/AddIssueModal').then(mod => mod.AddIssueModal), {
  ssr: false,
});

interface ProjectDetailHeaderProps {
  projectName: string;
  projectId: string;
  users: any[];
}

export function ProjectDetailHeader({ projectName, projectId, users }: ProjectDetailHeaderProps) {
  const searchParams = useSearchParams();
  const params = useParams();
  const workspaceSlug = params?.workspace as string;
  const { isPending, startTabTransition, pendingTab } = useProjectTransition();
  const activeTab = (searchParams.get('tab') || 'overview').toLowerCase();
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const handleTabClick = (tabId: string) => {
    if (tabId === activeTab) return;
    startTabTransition(`/dashboard/${workspaceSlug}/projects/${projectId}?tab=${tabId}`);
  };

  return (
    <div className="border-b border-gray-100 bg-white pl-8 pr-4 pt-4 pb-0 flex flex-col gap-4">
      {/* Top row: Breadcrumbs & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href={`/dashboard/${workspaceSlug}/projects`} className="hover:text-indigo-600 transition-colors">Projects</Link>
          <ChevronRight size={14} className="text-gray-300" />
          <span className="text-gray-900 font-medium">{projectName}</span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-[11px] font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-600/20 active:scale-95 mr-2"
          >
            <Plus size={14} />
            <span>New Issue</span>
          </button>

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
      </div>

      {isModalOpen && (
        <AddIssueModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          projects={[{ id: projectId, project_name: projectName }]}
          users={users}
        />
      )}

      <div className="flex items-center gap-6 text-[#1A1F2C]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isActuallyPending = isPending && pendingTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              disabled={isPending}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-all relative group ${
                isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              } ${isActuallyPending ? 'animate-pulse opacity-70' : ''}`}
            >
              <tab.icon size={16} />
              {tab.name}
              
              {/* Shimmer line for pending state */}
              {isActuallyPending && (
                <div className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-indigo-400 overflow-hidden rounded-full">
                  <div className="h-full w-full bg-linear-to-r from-transparent via-white/50 to-transparent animate-[shimmer_1.5s_infinite] -translate-x-full" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
