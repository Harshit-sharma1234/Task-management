import { create } from 'zustand';

interface TeamStore {
  users: any[];
  isAdmin: boolean;
  currentUserRole: string | null;
  workspaceId: string | null;
  hasFetched: boolean;
  setTeamData: (users: any[], isAdmin: boolean, currentUserRole: string | null, workspaceId: string) => void;
  setHasFetched: (val: boolean) => void;
  removeUser: (userId: string) => void;
  updateRole: (userId: string, newRole: string) => void;
  reset: () => void;
  refresh: () => Promise<void>;
}

export const useTeamStore = create<TeamStore>((set, get) => ({
  users: [],
  isAdmin: false,
  currentUserRole: null,
  workspaceId: null,
  hasFetched: false,
  setTeamData: (users, isAdmin, currentUserRole, workspaceId) => set({ users, isAdmin, currentUserRole, workspaceId, hasFetched: true }),
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
  reset: () => set({ users: [], isAdmin: false, currentUserRole: null, workspaceId: null, hasFetched: false }),
  refresh: async () => {
    const { workspaceId } = get();
    if (!workspaceId) return;
    const { fetchTeamData } = await import('@/app/dashboard/[workspace]/team/actions');
    const data = await fetchTeamData(workspaceId, true);
    set({ users: data.users, isAdmin: data.isAdmin, currentUserRole: data.currentUserRole });
  },
}));
