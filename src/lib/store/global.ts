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
  
  // Issues (used by AddIssueModal for optimistic updates)
  addIssue: (issue: any) => void;
  removeIssue: (id: string) => void;
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

  addIssue: (issue) => {
    // Note: Issues are currently managed locally in IssuesView, 
    // but AddIssueModal uses this store for optimistic coordination.
    console.log('[GlobalStore] addIssue called:', issue);
  },

  removeIssue: (id) => {
    console.log('[GlobalStore] removeIssue called:', id);
  },
}));
