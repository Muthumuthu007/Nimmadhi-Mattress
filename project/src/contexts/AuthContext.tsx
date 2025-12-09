import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../utils/authService';

interface AuthUser {
  username: string;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

interface AuthContextType {
  user: AuthUser;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, isAdmin: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser>({
    username: '',
    isAuthenticated: false,
    isAdmin: false
  });

  useEffect(() => {
    // Initialize state from authService on mount
    const token = authService.getToken();
    const role = authService.getRole();
    const username = authService.getUsername();

    if (token && username) {
      setUser({
        username,
        isAuthenticated: true,
        isAdmin: role === 'admin'
      });
    }
  }, []);

  const login = (username: string, isAdmin: boolean) => {
    // This function is mainly for updating the context state
    // The actual login API call happens in Login.tsx via authService
    setUser({
      username,
      isAuthenticated: true,
      isAdmin
    });
  };

  const logout = () => {
    authService.logout();
    setUser({
      username: '',
      isAuthenticated: false,
      isAdmin: false
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: user.isAuthenticated,
      isAdmin: user.isAdmin,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};