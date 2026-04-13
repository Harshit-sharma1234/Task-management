import { create } from 'zustand';

interface GlobalState {
  projects: any[];
  team: any[];
  isInitialLoadComplete: boolean;
  
  setProjects: (projects: any[]) => void;
  setTeam: (team: any[]) => void;
  setInitialLoadComplete: (val: boolean) => void;
  
  updateProject: (project: any) => void;
  updateTeamMember: (member: any) => void;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  projects: [],
  team: [],
  isInitialLoadComplete: false,

  setProjects: (projects) => set({ projects }),
  setTeam: (team) => set({ team }),
  setInitialLoadComplete: (val) => set({ isInitialLoadComplete: val }),

  updateProject: (updatedProject) => set((state) => ({
    projects: state.projects.map(p => p.id === updatedProject.id ? { ...p, ...updatedProject } : p)
  })),

  updateTeamMember: (updatedMember) => set((state) => ({
    team: state.team.map(m => m.id === updatedMember.id ? { ...m, ...updatedMember } : m)
  })),
}));
