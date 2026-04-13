import { create } from 'zustand';

/**
 * Global avatar store. When the user updates their profile picture,
 * this store broadcasts the new URL to every component that displays it
 * (Header, UserDropdown, Comments, etc.) — without requiring a page reload.
 */
interface AvatarStore {
  /** Current user's avatar URL (null = use server data, undefined = not set yet) */
  avatarUrl: string | null | undefined;
  /** Set a new avatar URL globally */
  setAvatarUrl: (url: string | null) => void;
}

export const useAvatarStore = create<AvatarStore>((set) => ({
  avatarUrl: undefined, // undefined = "not overridden, use server data"
  setAvatarUrl: (url) => set({ avatarUrl: url }),
}));
