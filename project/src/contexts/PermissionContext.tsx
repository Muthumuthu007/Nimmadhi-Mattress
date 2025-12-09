import React, { createContext, useContext, useState, useEffect } from 'react';

interface PermissionContextType {
  isDispatchedPageVisible: boolean;
  toggleDispatchedPage: () => void;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDispatchedPageVisible, setIsDispatchedPageVisible] = useState(() => {
    const stored = localStorage.getItem('isDispatchedPageVisible');
    return stored === null ? true : stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem('isDispatchedPageVisible', isDispatchedPageVisible.toString());
  }, [isDispatchedPageVisible]);

  const toggleDispatchedPage = () => {
    setIsDispatchedPageVisible(prev => !prev);
  };

  return (
    <PermissionContext.Provider value={{ isDispatchedPageVisible, toggleDispatchedPage }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};