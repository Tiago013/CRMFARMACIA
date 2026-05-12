import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  role: string;
  tenant_id: string;
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
      
      login: (user, token) => set({ user, accessToken: token, isAuthenticated: true }),
      
      logout: () => {
        // Here we could also clear cookies or call backend to blacklist token
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
      
      setToken: (token) => set({ accessToken: token }),
    }),
    {
      name: 'auth-storage', // name of the item in the storage (must be unique)
      // by default, it uses localStorage
    }
  )
);
