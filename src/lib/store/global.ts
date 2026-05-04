import { create } from 'zustand';

interface GlobalState {
  projects: any[];
  team: any[];
  activeWorkspaceId: string | null;
  isInitialLoadComplete: boolean;
  myProjectIds: string[];
  
  setProjects: (projects: any[]) => void;
  setMyProjectIds: (ids: string[]) => void;
  setTeam: (team: any[]) => void;
  setActiveWorkspaceId: (id: string | null) => void;
  setInitialLoadComplete: (val: boolean) => void;
  
  updateProject: (project: any) => void;
  addProject: (project: any) => void;
  removeProject: (projectId: string) => void;
  updateTeamMember: (member: any) => void;
  addTeamMember: (member: any) => void;
  removeTeamMember: (memberId: string) => void;
  
  // Issues (used by AddIssueModal for optimistic updates)
  addIssue: (issue: any) => void;
  removeIssue: (id: string) => void;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  projects: [],
  team: [],
  activeWorkspaceId: null,
  isInitialLoadComplete: false,
  myProjectIds: [],

  setProjects: (projects) => set({ projects }),
  setMyProjectIds: (ids) => set({ myProjectIds: ids }),
  setTeam: (team) => set({ team }),
  setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
  setInitialLoadComplete: (val) => set({ isInitialLoadComplete: val }),

  updateProject: (updatedProject) => set((state) => ({
    projects: state.projects.map(p => p.id === updatedProject.id ? { ...p, ...updatedProject } : p)
  })),

  addProject: (project) => set((state) => {
    const exists = state.projects.some(p => p.id === project.id);
    if (exists) return state;
    return {
      projects: [project, ...state.projects]
    };
  }),

  removeProject: (projectId) => set((state) => ({
    projects: state.projects.filter(p => p.id !== projectId)
  })),

  updateTeamMember: (updatedMember) => set((state) => ({
    team: state.team.map(m => m.id === updatedMember.id ? { ...m, ...updatedMember } : m)
  })),

  addTeamMember: (member) => set((state) => ({
    team: [member, ...state.team]
  })),

  removeTeamMember: (memberId) => set((state) => ({
    team: state.team.filter(m => m.id !== memberId)
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
