'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { ProjectOverviewSkeleton } from './ProjectOverviewSkeleton';
import { IssueListSkeleton } from './issues/IssueListSkeleton';

export const ProjectOverview = dynamic(
  () => import('./ProjectOverview').then(mod => mod.ProjectOverview),
  { 
    ssr: false, 
    loading: () => <ProjectOverviewSkeleton /> 
  }
);

export const ProjectIssuesRealtimeTab = dynamic(
  () => import('./ProjectIssuesRealtimeTab').then(mod => mod.ProjectIssuesRealtimeTab),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 bg-[#fbfbfb] min-h-full">
        <IssueListSkeleton />
      </div>
    ),
  }
);
