import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';

const Layout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <Header />
      <main className="container mx-auto py-4 sm:py-6 md:py-8 px-4 sm:px-6 lg:px-8 max-w-[1400px]">
        <Outlet key={location.pathname} />
      </main>
    </div>
  );
};

export default Layout;