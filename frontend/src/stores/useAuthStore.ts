import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  tenant_id: string;
  plan?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      
      login: (user, token) => {
        // Set cookie for middleware
        if (typeof document !== 'undefined') {
          document.cookie = `auth_token=${token}; path=/; max-age=86400; SameSite=Strict`;
        }
        set({ user, accessToken: token, isAuthenticated: true });
      },
      
      logout: () => {
        // Remove cookie
        if (typeof document !== 'undefined') {
          document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
      
      setToken: (token) => {
        if (typeof document !== 'undefined') {
          document.cookie = `auth_token=${token}; path=/; max-age=86400; SameSite=Strict`;
        }
        set({ accessToken: token });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
