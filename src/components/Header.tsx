import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LogOut, FileText, Shield, Menu, X, Package,
  LayoutDashboard, PackageSearch, Factory, Droplet, ClipboardList
} from 'lucide-react';
import logo from '../assets/logo.png';

import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionContext';
import { ThemeToggle } from './ThemeToggle';

export const Header = () => {
  const navigate = useNavigate();
  const { logout, isAdmin, hasPermission } = useAuth();
  const { isDispatchedPageVisible } = usePermissions();
  const [isMenuOpen, setIsMenuOpen] = useState(false);


  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `${isActive ? 'bg-primary-700 text-white' : 'text-primary-100'} block px-3 py-2 rounded-md text-base font-medium hover:bg-primary-700 hover:text-white transition-colors duration-200`;

  return (
    <header className="bg-primary dark:bg-gray-800 shadow-lg transition-colors border-b-2 border-primary-600 dark:border-primary-500">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <img
                src={logo}
                alt="Nimmadhi Mattress Logo"
                className="h-14 w-auto"
              />
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center flex-1 justify-end">
            {/* Main Navigation Group */}
            <div className="flex items-center space-x-1 lg:space-x-2">
              {hasPermission('grn') && (
                <NavLink
                  to="/dashboard/grn"
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <ClipboardList className="h-4 w-4 mr-1.5" />
                  <span className="hidden lg:inline">GRN</span>
                </NavLink>
              )}

              {hasPermission('dashboard') && (
                <NavLink
                  to="/dashboard"
                  end
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <LayoutDashboard className="h-4 w-4 mr-1.5" />
                  <span className="hidden lg:inline">Dashboard</span>
                </NavLink>
              )}

              {hasPermission('costing') && (
                <NavLink
                  to="/dashboard/costing"
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Droplet className="h-4 w-4 mr-1.5" />
                  <span className="hidden lg:inline">Costing</span>
                </NavLink>
              )}

              {hasPermission('inventory') && (
                <NavLink
                  to="/dashboard/inventory"
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <PackageSearch className="h-4 w-4 mr-1.5" />
                  <span className="hidden lg:inline">Inventory</span>
                </NavLink>
              )}

              {hasPermission('production') && (
                <NavLink
                  to="/dashboard/production"
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Factory className="h-4 w-4 mr-1.5" />
                  <span className="hidden lg:inline">Production</span>
                </NavLink>
              )}

              {isDispatchedPageVisible && hasPermission('dispatch') && (
                <NavLink
                  to="/dashboard/dispatched"
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Package className="h-4 w-4 mr-1.5" />
                  <span className="hidden lg:inline">Dispatched</span>
                </NavLink>
              )}

              {hasPermission('reports') && (
                <NavLink
                  to="/dashboard/reports"
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <FileText className="h-4 w-4 mr-1.5" />
                  <span className="hidden lg:inline">Reports</span>
                </NavLink>
              )}
            </div>

            {/* Separator */}
            <div className="h-8 w-px bg-white/20 mx-3 lg:mx-4"></div>

            {/* Admin & Logout Group */}
            <div className="flex items-center space-x-1 lg:space-x-2">
              {isAdmin && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Shield className="h-4 w-4 mr-1.5" />
                  <span className="hidden lg:inline">Admin</span>
                </NavLink>
              )}

              {/* Theme Toggle */}
              <div className="scale-75 lg:scale-90">
                <ThemeToggle />
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-white/90 hover:bg-red-500/20 hover:text-white transition-all duration-200"
              >
                <LogOut className="h-4 w-4 mr-1.5" />
                <span className="hidden lg:inline">Logout</span>
              </button>
            </div>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-primary-100 hover:text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <NavLink
            to="/dashboard/grn"
            className={mobileNavLinkClass}
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="flex items-center">
              <ClipboardList className="h-4 w-4 mr-2" />
              GRN
            </span>
          </NavLink>
          <NavLink
            to="/dashboard"
            className={mobileNavLinkClass}
            onClick={() => setIsMenuOpen(false)}
            end
          >
            <span className="flex items-center">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </span>
          </NavLink>
          <NavLink
            to="/dashboard/costing"
            className={mobileNavLinkClass}
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="flex items-center">
              <Droplet className="h-4 w-4 mr-2" />
              Costing
            </span>
          </NavLink>
          <NavLink
            to="/dashboard/inventory"
            className={mobileNavLinkClass}
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="flex items-center">
              <PackageSearch className="h-4 w-4 mr-2" />
              Inventory
            </span>
          </NavLink>
          <NavLink
            to="/dashboard/production"
            className={mobileNavLinkClass}
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="flex items-center">
              <Factory className="h-4 w-4 mr-2" />
              Production
            </span>
          </NavLink>
          {isDispatchedPageVisible && (
            <NavLink
              to="/dashboard/dispatched"
              className={mobileNavLinkClass}
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="flex items-center">
                <Package className="h-4 w-4 mr-2" />
                Dispatched
              </span>
            </NavLink>
          )}
          <NavLink
            to="/dashboard/reports"
            className={mobileNavLinkClass}
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Reports
            </span>
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/admin"
              className={mobileNavLinkClass}
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Admin Panel
              </span>
            </NavLink>
          )}
          <button
            onClick={() => {
              handleLogout();
              setIsMenuOpen(false);
            }}
            className="w-full text-left flex items-center px-3 py-2 text-primary-100 hover:bg-primary-700 hover:text-white rounded-md transition-colors duration-200"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};