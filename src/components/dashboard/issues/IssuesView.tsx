'use client';

import { IssuesHeader } from './IssuesHeader';
import { IssuesList } from './IssuesList';

interface IssuesViewProps {
  tickets: any[];
  projects: any[];
  users: any[];
  activeFilter: string;
  currentUser: any;
}

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

const AddIssueModal = dynamic(() => import('./AddIssueModal').then(mod => mod.AddIssueModal), {
  ssr: false,
});

export function IssuesView({ tickets, projects, users, activeFilter: initialFilter, currentUser }: IssuesViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState(initialFilter || 'all');

  const filteredTickets = useMemo(() => {
    if (activeFilter === 'active') {
      return tickets.filter(t => t.status === 'in_progress' || t.status === 'to_do');
    } else if (activeFilter === 'backlog') {
      return tickets.filter(t => t.status === 'backlog');
    }
    return tickets;
  }, [tickets, activeFilter]);

  return (
    <div className="flex flex-col h-full bg-[#fbfbfb]">
      <IssuesHeader 
        totalIssues={filteredTickets.length} 
        projects={projects}
        users={users}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onOpenModal={() => setIsModalOpen(true)}
      />

      <div className="flex-1 overflow-y-auto pt-6 px-8 w-full">
        <IssuesList 
          tickets={filteredTickets} 
          users={users} 
          onOpenModal={() => setIsModalOpen(true)}
          currentUser={currentUser}
          isMyTasks={false}
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
