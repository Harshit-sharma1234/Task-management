import { create } from 'zustand';

/**
 * Minimal Zustand store for notification badge state.
 * 
 * Philosophy: Server → fetch data, Client → minimal state.
 * Only stores the unread count needed by the Sidebar badge.
 * The full notification list lives in the Inbox page's local state.
 */
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
