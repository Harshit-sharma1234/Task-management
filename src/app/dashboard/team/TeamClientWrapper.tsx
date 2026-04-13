'use client';

import { useEffect, useState } from 'react';
import { useTeamStore } from '@/lib/store/team';
import { fetchTeamData } from './actions';
import { TeamHeader } from '@/components/dashboard/TeamHeader';
import { TeamList } from '@/components/dashboard/TeamList';
import { TeamSkeleton } from '@/components/dashboard/TeamSkeleton';

export function TeamClientWrapper() {
  const { users, isAdmin, currentUserRole, hasFetched, setTeamData } = useTeamStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasFetched) {
      fetchTeamData().then(data => {
        setTeamData(data.users, data.isAdmin, data.currentUserRole);
      }).catch(err => {
        console.error(err);
        setError('Failed to load team data');
      });
    }
  }, [hasFetched, setTeamData]);

  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!hasFetched) return <TeamSkeleton />;

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-6 w-full h-full">
      {/* Header */}
      <TeamHeader isAdmin={isAdmin} />

      {/* Team List with Search */}
      <TeamList isAdmin={isAdmin} currentUserRole={currentUserRole} />
    </div>
  );
}
