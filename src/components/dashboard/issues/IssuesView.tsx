'use client';

import { IssuesHeader } from './IssuesHeader';
import { IssuesList } from './IssuesList';

interface IssuesViewProps {
  tickets: any[];
  projects: any[];
  users: any[];
  activeFilter: string;
}

import { useState } from 'react';
import dynamic from 'next/dynamic';

const AddIssueModal = dynamic(() => import('./AddIssueModal').then(mod => mod.AddIssueModal), {
  ssr: false,
});

export function IssuesView({ tickets, projects, users, activeFilter }: IssuesViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex flex-col h-full bg-[#fbfbfb]">
      <IssuesHeader 
        totalIssues={tickets.length} 
        projects={projects}
        users={users}
        activeFilter={activeFilter}
        onOpenModal={() => setIsModalOpen(true)}
      />

      <div className="flex-1 overflow-y-auto pt-6 px-8 w-full">
        <IssuesList 
          tickets={tickets} 
          users={users} 
          onOpenModal={() => setIsModalOpen(true)} 
        />
      </div>

      {isModalOpen && (
        <AddIssueModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          projects={projects}
          users={users}
        />
      )}
    </div>
  );
}
