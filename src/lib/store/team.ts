import { create } from 'zustand';

interface TeamStore {
  users: any[];
  isAdmin: boolean;
  hasFetched: boolean;
  setTeamData: (users: any[], isAdmin: boolean) => void;
}

export const useTeamStore = create<TeamStore>((set) => ({
  users: [],
  isAdmin: false,
  hasFetched: false,
  setTeamData: (users, isAdmin) => set({ users, isAdmin, hasFetched: true }),
}));
