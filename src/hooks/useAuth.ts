import { useAuthContext } from '../context/AuthContext';
import { AuthUser } from '../types';

export interface UseAuthReturn {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
}

export function useAuth(): UseAuthReturn {
  return useAuthContext();
}
