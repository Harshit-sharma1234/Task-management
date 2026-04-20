'use client';

import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/lib/store/settings';
import { fetchSettingsData } from './actions';
import { SettingsTabs } from '@/app/dashboard/[workspace]/settings/SettingsTabs';
import { SettingsSkeleton } from '@/components/dashboard/SettingsSkeleton';

import { useParams } from 'next/navigation';

export function SettingsClientWrapper() {
  const params = useParams();
  const workspaceSlug = params?.workspace as string;

  const { user, hasFetched, setUserData } = useSettingsStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (workspaceSlug) {
      fetchSettingsData(workspaceSlug).then(data => {
        setUserData(data);
      }).catch(err => {
        console.error(err);
        setError('Failed to load settings data');
      });
    }
  }, [workspaceSlug, setUserData]);

  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!user || user.activeWorkspace?.slug !== workspaceSlug) return <SettingsSkeleton />;

  return <SettingsTabs user={user as any} />;
}
