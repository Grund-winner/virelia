import { create } from 'zustand';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
}

export interface Companion {
  id: string;
  userId: string;
  name: string;
  personality: string;
  avatar: string;
  description: string;
  greeting: string;
  isActive: boolean;
  createdAt: string;
  lastMessage?: string;
  lastTime?: string;
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'companion';
  createdAt: string;
}

interface AppState {
  user: User | null;
  companions: Companion[];
  activeCompanion: Companion | null;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  isSidebarOpen: boolean;

  setUser: (user: User | null) => void;
  setCompanions: (companions: Companion[]) => void;
  setActiveCompanion: (companion: Companion | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessages: (messages: Message[]) => void;
  setLoading: (loading: boolean) => void;
  setSending: (sending: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  companions: [],
  activeCompanion: null,
  messages: [],
  isLoading: false,
  isSending: false,
  isSidebarOpen: false,

  setUser: (user) => set({ user }),
  setCompanions: (companions) => set({ companions }),
  setActiveCompanion: (companion) => set({ activeCompanion: companion }),
  setMessages: (messages) => set({ messages }),
  addMessages: (newMessages) =>
    set((state) => {
      const existingIds = new Set(state.messages.map((m) => m.id));
      const filtered = newMessages.filter((m) => !existingIds.has(m.id));
      return { messages: [...state.messages, ...filtered] };
    }),
  setLoading: (isLoading) => set({ isLoading }),
  setSending: (isSending) => set({ isSending }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
}));
