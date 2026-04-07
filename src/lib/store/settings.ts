import { create } from 'zustand';

interface SettingsStore {
  user: any | null;
  hasFetched: boolean;
  setUserData: (user: any) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  user: null,
  hasFetched: false,
  setUserData: (user) => set({ user, hasFetched: true }),
}));
