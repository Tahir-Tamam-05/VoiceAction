import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthState, AuthUser } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const saved = localStorage.getItem("voiceaction_user");
    if (saved) {
      try {
        setAuthState({ user: JSON.parse(saved), isAuthenticated: true, isLoading: false });
      } catch (e) {
        localStorage.removeItem("voiceaction_user");
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    // Mock login
    const user: AuthUser = {
      id: 'user_1',
      name: email.split('@')[0],
      email: email,
      createdAt: Date.now(),
    };
    localStorage.setItem("voiceaction_user", JSON.stringify(user));
    setAuthState({ user, isAuthenticated: true, isLoading: false });
  };

  const signup = async (name: string, email: string, password: string): Promise<void> => {
    // Mock signup
    const user: AuthUser = {
      id: 'user_1',
      name: name,
      email: email,
      createdAt: Date.now(),
    };
    localStorage.setItem("voiceaction_user", JSON.stringify(user));
    setAuthState({ user, isAuthenticated: true, isLoading: false });
  };

  const logout = (): void => {
    localStorage.removeItem("voiceaction_user");
    setAuthState({ user: null, isAuthenticated: false, isLoading: false });
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
