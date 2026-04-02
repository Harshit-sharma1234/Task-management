'use client';

import { IssuesHeader } from './IssuesHeader';
import { IssuesList } from './IssuesList';

interface IssuesViewProps {
  tickets: any[];
  projects: any[];
  users: any[];
  activeFilter: string;
}

export function IssuesView({ tickets, projects, users, activeFilter }: IssuesViewProps) {
  return (
    <div className="flex flex-col h-full bg-[#fbfbfb]">
      <IssuesHeader 
        totalIssues={tickets.length} 
        projects={projects}
        users={users}
        activeFilter={activeFilter}
      />

      <div className="flex-1 overflow-y-auto pt-6 px-8 w-full">
        <IssuesList tickets={tickets} users={users} />
      </div>
    </div>
  );
}
