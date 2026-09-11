// ============================================
// TrimedCast LEAN — Auth store (Zustand)
// Tracks the current user + loading state.
// ============================================

import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  phone: string;
  businessName: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean; // checking session on page load
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) { console.error(e); }
    set({ user: null });
  },
}));
