import { create } from 'zustand';

interface GlobalState {
  projects: any[];
  team: any[];
  activeWorkspaceId: string | null;
  isInitialLoadComplete: boolean;
  
  setProjects: (projects: any[]) => void;
  setTeam: (team: any[]) => void;
  setActiveWorkspaceId: (id: string | null) => void;
  setInitialLoadComplete: (val: boolean) => void;
  
  updateProject: (project: any) => void;
  updateTeamMember: (member: any) => void;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  projects: [],
  team: [],
  activeWorkspaceId: null,
  isInitialLoadComplete: false,

  setProjects: (projects) => set({ projects }),
  setTeam: (team) => set({ team }),
  setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
  setInitialLoadComplete: (val) => set({ isInitialLoadComplete: val }),

  updateProject: (updatedProject) => set((state) => ({
    projects: state.projects.map(p => p.id === updatedProject.id ? { ...p, ...updatedProject } : p)
  })),

  updateTeamMember: (updatedMember) => set((state) => ({
    team: state.team.map(m => m.id === updatedMember.id ? { ...m, ...updatedMember } : m)
  })),
}));
