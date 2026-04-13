import { create } from 'zustand';

interface TeamStore {
  users: any[];
  isAdmin: boolean;
  currentUserRole: string | null;
  hasFetched: boolean;
  setTeamData: (users: any[], isAdmin: boolean, currentUserRole: string | null) => void;
  setHasFetched: (val: boolean) => void;
  removeUser: (userId: string) => void;
  updateRole: (userId: string, newRole: string) => void;
  refresh: () => Promise<void>;
}

export const useTeamStore = create<TeamStore>((set) => ({
  users: [],
  isAdmin: false,
  currentUserRole: null,
  hasFetched: false,
  setTeamData: (users, isAdmin, currentUserRole) => set({ users, isAdmin, currentUserRole, hasFetched: true }),
  setHasFetched: (val: boolean) => set({ hasFetched: val }),
  removeUser: (userId: string) => set((state) => ({ 
    users: state.users.filter(u => u.id !== userId) 
  })),
  updateRole: (userId: string, newRole: string) => set((state) => ({
    users: state.users.map(u => 
      u.id === userId 
        ? { ...u, roles: { ...u.roles, role_name: newRole } } 
        : u
    )
  })),
  refresh: async () => {
    const { fetchTeamData } = await import('@/app/dashboard/team/actions');
    const data = await fetchTeamData();
    useTeamStore.getState().setTeamData(data.users, data.isAdmin, data.currentUserRole);
  },
}));
