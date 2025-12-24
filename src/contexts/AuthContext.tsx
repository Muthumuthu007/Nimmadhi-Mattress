import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../utils/authService';

interface AuthUser {
  username: string;
  isAuthenticated: boolean;
  isAdmin: boolean;
  permissions: string[];
}

interface AuthContextType {
  user: AuthUser;
  isAuthenticated: boolean;
  isAdmin: boolean;
  permissions: string[];
  login: (username: string) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser>({
    username: '',
    isAuthenticated: false,
    isAdmin: false,
    permissions: []
  });

  useEffect(() => {
    // Initialize state from authService on mount
    const token = authService.getToken();
    const username = authService.getUsername();
    const isAuth = authService.isAuthenticated();

    if (token && username && isAuth) {
      setUser({
        username,
        isAuthenticated: true,
        isAdmin: authService.isAdmin(),
        permissions: authService.getPermissions()
      });
    } else if (!isAuth && token) {
      // Token expired or invalid
      authService.logout();
    }
  }, []);

  const login = (username: string) => {
    // This function is mainly for updating the context state
    // The actual login API call happens in Login.tsx via authService
    setUser({
      username,
      isAuthenticated: true,
      isAdmin: authService.isAdmin(),
      permissions: authService.getPermissions()
    });
  };

  const logout = () => {
    authService.logout();
    setUser({
      username: '',
      isAuthenticated: false,
      isAdmin: false,
      permissions: []
    });
  };

  const hasPermission = (permission: string) => {
    return user.permissions.includes(permission) || user.permissions.includes('admin');
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: user.isAuthenticated,
      isAdmin: user.isAdmin,
      permissions: user.permissions,
      login,
      logout,
      hasPermission
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