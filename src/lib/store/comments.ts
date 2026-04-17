import { create } from 'zustand';

export interface Comment {
  id: string;
  comment: string;
  created_at: string;
  user_id?: string;
  users: {
    id?: string;
    name: string;
    email: string;
    avatar_url?: string | null;
  };
  attachments?: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
}

interface CommentsState {
  // Map of ticketId -> array of comments
  commentsMap: Record<string, Comment[]>;
  knownTempIds: Record<string, Set<string>>; // Map of ticketId -> set of temp IDs to track deduplication

  setInitialComments: (ticketId: string, comments: Comment[]) => void;
  addCommentOptimistic: (ticketId: string, comment: Comment) => void;
  addCommentRealtime: (ticketId: string, comment: Comment) => void;
  replaceTempComment: (ticketId: string, tempId: string, realComment: Comment) => void;
  removeComment: (ticketId: string, tempId: string) => void;
  updateComment: (ticketId: string, commentId: string, newText: string) => void;
}

export const useCommentsStore = create<CommentsState>((set) => ({
  commentsMap: {},
  knownTempIds: {},

  setInitialComments: (ticketId, comments) =>
    set((state) => ({
      commentsMap: { ...state.commentsMap, [ticketId]: comments },
    })),

  addCommentOptimistic: (ticketId, comment) =>
    set((state) => {
      const existing = state.commentsMap[ticketId] || [];
      const tempIds = state.knownTempIds[ticketId] || new Set();
      
      // If we already know this temp comment, ignore
      if (tempIds.has(comment.id)) return state;

      const newTempIds = new Set(tempIds);
      newTempIds.add(comment.id);

      return {
        commentsMap: { ...state.commentsMap, [ticketId]: [...existing, comment] },
        knownTempIds: { ...state.knownTempIds, [ticketId]: newTempIds },
      };
    }),

  addCommentRealtime: (ticketId, comment) =>
    set((state) => {
      const existing = state.commentsMap[ticketId] || [];
      const tempIds = state.knownTempIds[ticketId] || new Set();

      // Skip exact DB duplicates
      if (existing.some(c => c.id === comment.id)) {
        return state;
      }

      // Check if we need to deduplicate matching optimistic comments from the SAME user
      // If we made an optimistic update, we might have a temp-ID. If we receive the realtime
      // event with the SAME user_id and comment text, we replace the temp one.
      const withoutOptimistic = existing.filter(c => {
        if (!c.id.startsWith('temp-')) return true;
        const matches = c.user_id === comment.user_id && c.comment === comment.comment;
        if (matches) {
            // Found matching temp, we remove it from known sets too
            tempIds.delete(c.id);
            return false; 
        }
        return true;
      });

      return {
        commentsMap: { ...state.commentsMap, [ticketId]: [...withoutOptimistic, comment] },
        knownTempIds: { ...state.knownTempIds, [ticketId]: tempIds },
      };
    }),

  replaceTempComment: (ticketId, tempId, realComment) =>
    set((state) => {
      const existing = state.commentsMap[ticketId] || [];
      const tempIds = state.knownTempIds[ticketId] || new Set();
      
      const newTempIds = new Set(tempIds);
      newTempIds.delete(tempId);
      newTempIds.add(realComment.id);

      return {
        commentsMap: {
          ...state.commentsMap,
          [ticketId]: existing.map(c => c.id === tempId ? realComment : c)
        },
        knownTempIds: { ...state.knownTempIds, [ticketId]: newTempIds },
      };
    }),

  removeComment: (ticketId, id) =>
    set((state) => {
      const existing = state.commentsMap[ticketId] || [];
      const tempIds = state.knownTempIds[ticketId] || new Set();
      
      const newTempIds = new Set(tempIds);
      newTempIds.delete(id);

      return {
        commentsMap: {
          ...state.commentsMap,
          [ticketId]: existing.filter(c => c.id !== id)
        },
        knownTempIds: { ...state.knownTempIds, [ticketId]: newTempIds }
      };
    }),

  updateComment: (ticketId, commentId, newText) =>
    set((state) => {
      const existing = state.commentsMap[ticketId] || [];
      return {
        commentsMap: {
          ...state.commentsMap,
          [ticketId]: existing.map(c => 
            c.id === commentId ? { ...c, comment: newText } : c
          )
        }
      };
    }),
}));
