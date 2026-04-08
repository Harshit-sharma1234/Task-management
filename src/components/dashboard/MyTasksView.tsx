'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { IssuesHeader } from './issues/IssuesHeader';
import { IssuesList } from './issues/IssuesList';

const AddIssueModal = dynamic(() => import('./issues/AddIssueModal').then(mod => mod.AddIssueModal), {
  ssr: false,
});

interface MyTasksViewProps {
  initialTickets: any[];
  projects: any[];
  users: any[];
  currentUser: any;
}

export function MyTasksView({ initialTickets, projects, users, currentUser }: MyTasksViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredTickets = useMemo(() => {
    if (activeFilter === 'active') {
      return initialTickets.filter(t => t.status === 'in_progress' || t.status === 'to_do');
    } else if (activeFilter === 'backlog') {
      return initialTickets.filter(t => t.status === 'backlog');
    }
    return initialTickets;
  }, [initialTickets, activeFilter]);

  return (
    <div className="flex flex-col h-full bg-[#fbfbfb]">
      {/* Header Section */}
      <IssuesHeader 
        totalIssues={filteredTickets.length} 
        projects={projects}
        users={users}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onOpenModal={() => setIsModalOpen(true)}
      />

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pt-6 px-8 w-full">
        <IssuesList 
          tickets={filteredTickets} 
          users={users} 
          onOpenModal={() => setIsModalOpen(true)}
          currentUser={currentUser}
          isMyTasks={true}
          emptyMessage="No tasks assigned to you"
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
