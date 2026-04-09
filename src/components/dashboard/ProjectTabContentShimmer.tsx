'use client';

import { useProjectTransition } from '@/lib/contexts/ProjectTransitionContext';
import { ProjectOverviewSkeleton } from './ProjectOverviewSkeleton';
import { IssueListSkeleton } from './issues/IssueListSkeleton';
import { ReactNode } from 'react';

export function ProjectTabContentShimmer({ children }: { children: ReactNode }) {
  const { isPending, pendingTab } = useProjectTransition();

  if (isPending && pendingTab) {
    return (
      <div className="bg-[#fbfbfb] min-h-full animate-in fade-in duration-300">
        {pendingTab === 'issues' ? (
          <div className="p-8">
            <IssueListSkeleton />
          </div>
        ) : (
          <ProjectOverviewSkeleton />
        )}
      </div>
    );
  }

  return <div className="animate-in fade-in duration-300">{children}</div>;
}
