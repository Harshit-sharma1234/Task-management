'use client';

import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/lib/store/settings';
import { fetchSettingsData } from './actions';
import { SettingsTabs } from '@/app/dashboard/[workspace]/settings/SettingsTabs';
import { SettingsSkeleton } from '@/components/dashboard/SettingsSkeleton';

export function SettingsClientWrapper() {
  const { user, hasFetched, setUserData } = useSettingsStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasFetched) {
      fetchSettingsData().then(data => {
        setUserData(data);
      }).catch(err => {
        console.error(err);
        setError('Failed to load settings data');
      });
    }
  }, [hasFetched, setUserData]);

  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!hasFetched || !user) return <SettingsSkeleton />;

  return <SettingsTabs user={user} />;
}
