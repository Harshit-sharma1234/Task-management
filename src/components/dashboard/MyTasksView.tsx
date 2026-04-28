'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { IssuesHeader } from './issues/IssuesHeader';
import { IssuesList } from './issues/IssuesList';
import { IssuesBoard } from './issues/IssuesBoard';
import {
  groupAndSortTickets,
  DisplaySettings
} from '@/lib/utils/issue-display-utils';

const AddIssueModal = dynamic(() => import('./issues/AddIssueModal').then(mod => mod.AddIssueModal), {
  ssr: false,
});

interface MyTasksViewProps {
  initialTickets: any[];
  projects: any[];
  users: any[];
  currentUser: any;
  workspaceSlug: string;
}

export function MyTasksView({ initialTickets, projects, users, currentUser, workspaceSlug }: MyTasksViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    viewMode: 'list',
    groupBy: 'status',
    sortBy: 'created_at',
    showProperties: ['id', 'status', 'assignee', 'priority']
  });

  const filteredTickets = useMemo(() => {
    let result = initialTickets;
    if (activeFilter === 'active') {
      result = initialTickets.filter(t => t.status === 'in_progress' || t.status === 'to_do');
    } else if (activeFilter === 'backlog') {
      result = initialTickets.filter(t => t.status === 'backlog');
    }
    return result;
  }, [initialTickets, activeFilter]);

  // Transform data based on display settings
  const groupedData = useMemo(() => {
    return groupAndSortTickets(filteredTickets, displaySettings);
  }, [filteredTickets, displaySettings]);

  return (
    <div className="flex flex-col h-full bg-[#fbfbfb]">
      {/* Header Section */}
      <IssuesHeader
        totalIssues={filteredTickets.length}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onOpenModal={() => setIsModalOpen(true)}
        displaySettings={displaySettings}
        onDisplaySettingsChange={setDisplaySettings}
      />

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto pt-6 px-8 w-full">
          {displaySettings.viewMode === 'list' ? (
            <IssuesList
              tickets={filteredTickets}
              groupedData={groupedData}
              displaySettings={displaySettings}
              users={users}
              onOpenModal={() => setIsModalOpen(true)}
              currentUser={currentUser}
              isMyTasks={true}
              emptyMessage="No tasks assigned to you"
              workspaceSlug={workspaceSlug}
            />
          ) : (
            <IssuesBoard
              groupedData={groupedData}
              users={users}
              currentUser={currentUser}
              displaySettings={displaySettings}
              onOpenModal={() => setIsModalOpen(true)}
              workspaceSlug={workspaceSlug}
            />
          )}
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
    </div>
  );
}
