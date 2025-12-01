import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  username: string;
  role: string;
  is_active: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      
      setAuth: (token, user) => {
        // Store token in localStorage for backward compatibility during migration
        // In production, token should be in httpOnly cookie only
        // TODO: Remove localStorage token storage once fully migrated to cookies
        if (token) {
          localStorage.setItem('token', token);
        }
        localStorage.setItem('user', JSON.stringify(user));
        set({ token, user });
      },
      
      clearAuth: () => {
        // Clear localStorage tokens
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Note: httpOnly cookies are cleared by backend /logout endpoint
        set({ token: null, user: null });
      },
      
      isAuthenticated: () => {
        return !!get().token;
      },
      
      isAdmin: () => {
        return get().user?.role === 'admin';
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

