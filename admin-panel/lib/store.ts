import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string | number;
  username: string;
  email?: string;
  role: string;
  is_active: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  supabaseUser: SupabaseUser | null;
  setAuth: (token: string, user: User | null, supabaseUser?: SupabaseUser | null) => void;
  setSupabaseUser: (supabaseUser: SupabaseUser | null) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      supabaseUser: null,
      
      setAuth: (token, user, supabaseUser) => {
        set({ token, user: user || null, supabaseUser: supabaseUser || null });
      },
      
      setSupabaseUser: (supabaseUser) => {
        set({ supabaseUser });
      },
      
      clearAuth: () => {
        set({ token: null, user: null, supabaseUser: null });
      },
      
      isAuthenticated: () => {
        return !!get().token || !!get().supabaseUser;
      },
      
      isAdmin: () => {
        const user = get().user;
        return user?.role === 'admin';
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

