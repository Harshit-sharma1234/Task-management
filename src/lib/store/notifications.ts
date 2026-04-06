import { create } from 'zustand';

interface NotificationStore {
  unreadCount: number;
  isHydrated: boolean;
  setUnreadCount: (count: number) => void;
  decrementUnreadCount: () => void;
  resetUnreadCount: () => void;
  markHydrated: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  unreadCount: 0,
  isHydrated: false,
  setUnreadCount: (count) => set({ unreadCount: count, isHydrated: true }),
  decrementUnreadCount: () =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
  resetUnreadCount: () => set({ unreadCount: 0 }),
  markHydrated: () => set({ isHydrated: true }),
}));
