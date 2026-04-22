import { create } from 'zustand';

interface GlobalState {
  projects: any[];
  team: any[];
  issues: any[];
  activeWorkspaceId: string | null;
  isInitialLoadComplete: boolean;
  
  setProjects: (projects: any[]) => void;
  setTeam: (team: any[]) => void;
  setIssues: (issues: any[]) => void;
  setActiveWorkspaceId: (id: string | null) => void;
  setInitialLoadComplete: (val: boolean) => void;
  
  addIssue: (issue: any) => void;
  removeIssue: (id: string) => void;
  updateProject: (project: any) => void;
  updateTeamMember: (member: any) => void;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  projects: [],
  team: [],
  issues: [],
  activeWorkspaceId: null,
  isInitialLoadComplete: false,

  setProjects: (projects) => set({ projects }),
  setTeam: (team) => set({ team }),
  setIssues: (issues) => set({ issues }),
  setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
  setInitialLoadComplete: (val) => set({ isInitialLoadComplete: val }),

  addIssue: (issue) => set((state) => ({ 
    issues: [issue, ...state.issues] 
  })),

  removeIssue: (id) => set((state) => ({ 
    issues: state.issues.filter(i => i.id !== id) 
  })),

  updateProject: (updatedProject) => set((state) => ({
    projects: state.projects.map(p => p.id === updatedProject.id ? { ...p, ...updatedProject } : p)
  })),

  updateTeamMember: (updatedMember) => set((state) => ({
    team: state.team.map(m => m.id === updatedMember.id ? { ...m, ...updatedMember } : m)
  })),
}));
