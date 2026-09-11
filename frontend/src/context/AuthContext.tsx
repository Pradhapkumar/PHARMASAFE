import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, RoleType } from '../types/api';
import authService from '../services/authService';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  switchRole: (roleKey: string) => Promise<void>;
  isAuthorized: (allowedRoles: RoleType[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(authService.getStoredUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    authService.getCurrentUser().then(user => {
      if (user) {
        setCurrentUser(user);
      } else {
        // In local demo or initial state, load stored user
        const stored = authService.getStoredUser();
        if (stored) setCurrentUser(stored);
      }
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await authService.login(email, pass);
    setCurrentUser(res.user);
  };

  const logout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  const switchRole = async (roleKey: string) => {
    const user = await authService.switchRole(roleKey);
    if (user) {
      setCurrentUser(user);
    }
  };

  const isAuthorized = (allowedRoles: RoleType[]) => {
    if (!currentUser) return false;
    return allowedRoles.includes(currentUser.role) || currentUser.role === 'ADMIN';
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
        logout,
        switchRole,
        isAuthorized,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
