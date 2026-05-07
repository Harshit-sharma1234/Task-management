'use client';

import { useEffect, useState } from 'react';
import { useTeamStore } from '@/lib/store/team';
import { fetchTeamData } from './actions';
import { TeamHeader } from '@/components/dashboard/TeamHeader';
import { TeamList } from '@/components/dashboard/TeamList';
import { TeamSkeleton } from '@/components/dashboard/TeamSkeleton';

export function TeamClientWrapper({ workspaceId }: { workspaceId: string }) {
  const { users, isAdmin, currentUserRole, hasFetched, setTeamData, reset, workspaceId: storedWorkspaceId } = useTeamStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we switched workspaces, reset the store
    if (storedWorkspaceId && storedWorkspaceId !== workspaceId) {
      reset();
      return;
    }

    if (!hasFetched) {
      fetchTeamData(workspaceId).then(data => {
        setTeamData(data.users, data.isAdmin, data.currentUserRole, workspaceId);
      }).catch(err => {
        console.error(err);
        setError('Failed to load team data');
      });
    }
  }, [hasFetched, setTeamData, workspaceId, reset, storedWorkspaceId]);

  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!hasFetched) return <TeamSkeleton />;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto flex flex-col gap-4 sm:gap-6 w-full h-full">
      {/* Header */}
      <TeamHeader isAdmin={isAdmin} currentUserRole={currentUserRole} workspaceId={workspaceId} />

      {/* Team List with Search */}
      <TeamList isAdmin={isAdmin} currentUserRole={currentUserRole} />
    </div>
  );
}
