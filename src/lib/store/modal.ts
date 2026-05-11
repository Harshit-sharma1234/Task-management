import { create } from 'zustand';

interface ModalState {
  isCreateIssueOpen: boolean;
  isShortcutHelpOpen: boolean;
  isCommandPaletteOpen: boolean;

  activeTicket: any | null;
  activeProject: any | null;
  
  // Context Menus
  activeContextMenu: 'status' | 'priority' | 'assignee' | 'reviewer' | 'project-status' | 'project-priority' | 'project-lead' | 'project-date' | 'project-date-start' | 'rename-issue' | 'rename-project' | 'delete-issue' | 'project-members' | null;
  
  setCreateIssueOpen: (open: boolean) => void;
  setShortcutHelpOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  
  setActiveTicket: (ticket: any | null) => void;
  setActiveProject: (project: any | null) => void;

  setActiveContextMenu: (menu: ModalState['activeContextMenu']) => void;
  
  optimisticTicketUpdates: Record<string, any>;
  setOptimisticTicketUpdate: (id: string, updates: any) => void;
  clearOptimisticTicketUpdate: (id: string) => void;

  optimisticProjectUpdates: Record<string, any>;
  setOptimisticProjectUpdate: (id: string, updates: any) => void;
  clearOptimisticProjectUpdate: (id: string) => void;

  toggleShortcutHelp: () => void;
  closeAll: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  isCreateIssueOpen: false,
  isShortcutHelpOpen: false,
  isCommandPaletteOpen: false,

  activeTicket: null,
  activeProject: null,

  activeContextMenu: null,
  
  setCreateIssueOpen: (open) => set({ isCreateIssueOpen: open, isShortcutHelpOpen: false, isCommandPaletteOpen: false, activeContextMenu: null }),
  setShortcutHelpOpen: (open) => set({ isShortcutHelpOpen: open, isCreateIssueOpen: false, isCommandPaletteOpen: false, activeContextMenu: null }),
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open, isCreateIssueOpen: false, isShortcutHelpOpen: false, activeContextMenu: null }),
  
  setActiveTicket: (ticket) => set({ activeTicket: ticket }),
  setActiveProject: (project) => set({ activeProject: project }),

  setActiveContextMenu: (menu) => set({ activeContextMenu: menu, isCommandPaletteOpen: false }),

  optimisticTicketUpdates: {},
  setOptimisticTicketUpdate: (id, updates) => set((state) => ({
    optimisticTicketUpdates: {
      ...state.optimisticTicketUpdates,
      [id]: { ...(state.optimisticTicketUpdates[id] || {}), ...updates }
    }
  })),
  clearOptimisticTicketUpdate: (id) => set((state) => {
    const newUpdates = { ...state.optimisticTicketUpdates };
    delete newUpdates[id];
    return { optimisticTicketUpdates: newUpdates };
  }),

  optimisticProjectUpdates: {},
  setOptimisticProjectUpdate: (id, updates) => set((state) => ({
    optimisticProjectUpdates: {
      ...state.optimisticProjectUpdates,
      [id]: { ...(state.optimisticProjectUpdates[id] || {}), ...updates }
    }
  })),
  clearOptimisticProjectUpdate: (id) => set((state) => {
    const newUpdates = { ...state.optimisticProjectUpdates };
    delete newUpdates[id];
    return { optimisticProjectUpdates: newUpdates };
  }),

  toggleShortcutHelp: () => set((state) => ({ 
    isShortcutHelpOpen: !state.isShortcutHelpOpen,
    isCreateIssueOpen: false,
    isCommandPaletteOpen: false,
    activeContextMenu: null
  })),
  closeAll: () => set({ 
    isCreateIssueOpen: false, 
    isShortcutHelpOpen: false, 
    isCommandPaletteOpen: false,
    activeContextMenu: null 
  }),
}));
