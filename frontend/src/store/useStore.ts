import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/auth';
import { Elderly } from '@/types/elderly';
import { Call } from '@/types/calls';

interface StoreState {
  // Auth
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  authLoading: boolean;

  // Elderly
  elderlyList: Elderly[];
  currentElderly: Elderly | null;
  elderlyLoading: boolean;

  // Calls
  currentCall: Call | null;
  callsList: Call[];
  callsLoading: boolean;
  chatMessages: Array<{ role: string; content: string; is_streaming?: boolean }>;

  // UI
  sidebarOpen: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setTokens: (access: string, refresh: string) => void;
  setAuthLoading: (loading: boolean) => void;
  logout: () => void;

  setElderlyList: (list: Elderly[]) => void;
  setCurrentElderly: (elderly: Elderly | null) => void;
  setElderlyLoading: (loading: boolean) => void;

  setCurrentCall: (call: Call | null) => void;
  setCallsList: (list: Call[]) => void;
  setCallsLoading: (loading: boolean) => void;
  addChatMessage: (message: { role: string; content: string; is_streaming?: boolean }) => void;
  clearChatMessages: () => void;

  setSidebarOpen: (open: boolean) => void;
  setError: (error: string | null) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      // Auth initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      authLoading: false,

      // Elderly initial state
      elderlyList: [],
      currentElderly: null,
      elderlyLoading: false,

      // Calls initial state
      currentCall: null,
      callsList: [],
      callsLoading: false,
      chatMessages: [],

      // UI initial state
      sidebarOpen: true,
      error: null,

      // Auth actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setTokens: (access, refresh) =>
        set({ accessToken: access, refreshToken: refresh }),
      setAuthLoading: (loading) => set({ authLoading: loading }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          elderlyList: [],
          currentElderly: null,
          currentCall: null,
          callsList: [],
          chatMessages: [],
        }),

      // Elderly actions
      setElderlyList: (list) => set({ elderlyList: list }),
      setCurrentElderly: (elderly) => set({ currentElderly: elderly }),
      setElderlyLoading: (loading) => set({ elderlyLoading: loading }),

      // Calls actions
      setCurrentCall: (call) => set({ currentCall: call }),
      setCallsList: (list) => set({ callsList: list }),
      setCallsLoading: (loading) => set({ callsLoading: loading }),
      addChatMessage: (message) =>
        set((state) => ({
          chatMessages: [...state.chatMessages, message],
        })),
      clearChatMessages: () => set({ chatMessages: [] }),

      // UI actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'sori-store',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
