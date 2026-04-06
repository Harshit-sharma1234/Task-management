import { create } from 'zustand';

export interface IssueUpdate {
  id: string;
  status?: string;
  priority?: string;
  assignee_id?: string | null;
  reviewer_id?: string | null;
}

interface IssuesStore {
  /** Map of ticketId → pending optimistic field overrides */
  optimisticUpdates: Record<string, Partial<IssueUpdate>>;

  /** Apply an optimistic update (merges with any existing pending updates for the same ticket) */
  applyOptimistic: (id: string, updates: Partial<IssueUpdate>) => void;

  /** Revert an optimistic update (e.g. on server error) */
  revertOptimistic: (id: string) => void;

  /** Clear an optimistic update (e.g. after server confirms success and revalidation arrives) */
  clearOptimistic: (id: string) => void;

  /** Clear all optimistic updates (e.g. after bulk action completes) */
  clearAll: () => void;
}

export const useIssuesStore = create<IssuesStore>((set) => ({
  optimisticUpdates: {},

  applyOptimistic: (id, updates) =>
    set((state) => ({
      optimisticUpdates: {
        ...state.optimisticUpdates,
        [id]: { ...state.optimisticUpdates[id], ...updates },
      },
    })),

  revertOptimistic: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.optimisticUpdates;
      return { optimisticUpdates: rest };
    }),

  clearOptimistic: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.optimisticUpdates;
      return { optimisticUpdates: rest };
    }),

  clearAll: () => set({ optimisticUpdates: {} }),
}));
