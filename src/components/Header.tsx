import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut, FileText, Shield, Menu, X, Package,
  LayoutDashboard, PackageSearch, Factory, Droplet, ClipboardList
} from 'lucide-react';
import logo from '../assets/logo.png';

import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionContext';
import { ThemeToggle } from './ThemeToggle';

// ─── Nav link definition ──────────────────────────────────────────────────────

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
  visible: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, isAdmin, hasPermission } = useAuth();
  const { isDispatchedPageVisible } = usePermissions();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems: NavItem[] = [
    { to: '/dashboard/grn',        label: 'GRN',        icon: <ClipboardList className="h-4 w-4" />, visible: hasPermission('grn') },
    { to: '/dashboard',            label: 'Dashboard',  icon: <LayoutDashboard className="h-4 w-4" />, end: true, visible: hasPermission('dashboard') },
    { to: '/dashboard/costing',    label: 'Costing',    icon: <Droplet className="h-4 w-4" />, visible: hasPermission('costing') },
    { to: '/dashboard/inventory',  label: 'Inventory',  icon: <PackageSearch className="h-4 w-4" />, visible: hasPermission('inventory') },
    { to: '/dashboard/production', label: 'Production', icon: <Factory className="h-4 w-4" />, visible: hasPermission('production') },
    { to: '/dashboard/dispatched', label: 'Dispatched', icon: <Package className="h-4 w-4" />, visible: isDispatchedPageVisible && hasPermission('dispatch') },
    { to: '/dashboard/reports',    label: 'Reports',    icon: <FileText className="h-4 w-4" />, visible: hasPermission('reports') },
  ];

  const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
      isActive
        ? 'bg-white/20 text-white shadow-sm'
        : 'text-white/90 hover:bg-white/10 hover:text-white'
    }`;

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${
      isActive
        ? 'bg-white/20 text-white'
        : 'text-white/80 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <>
      <header
        ref={menuRef}
        className="bg-primary dark:bg-gray-800 shadow-lg transition-colors border-b-2 border-primary-600 dark:border-primary-500 relative z-40"
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* ── Logo ── */}
            <div className="flex-shrink-0">
              <img src={logo} alt="Nimmadhi Mattress Logo" className="h-14 w-auto" />
            </div>

            {/* ── Desktop Navigation ── */}
            <nav className="hidden md:flex items-center gap-1 flex-1 justify-end">
              {/* Main links */}
              <div className="flex items-center gap-0.5 lg:gap-1 flex-wrap justify-end">
                {navItems.filter(n => n.visible).map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={desktopLinkClass}
                  >
                    {item.icon}
                    <span className="hidden lg:inline">{item.label}</span>
                  </NavLink>
                ))}
              </div>

              {/* Separator */}
              <div className="h-8 w-px bg-white/20 mx-2 lg:mx-3 shrink-0" />

              {/* Admin + ThemeToggle + Logout */}
              <div className="flex items-center gap-0.5 lg:gap-1">
                {isAdmin && (
                  <NavLink to="/admin" className={desktopLinkClass}>
                    <Shield className="h-4 w-4" />
                    <span className="hidden lg:inline">Admin</span>
                  </NavLink>
                )}

                <div className="scale-75 lg:scale-90">
                  <ThemeToggle />
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white/90 hover:bg-red-500/20 hover:text-white transition-all duration-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden lg:inline">Logout</span>
                </button>
              </div>
            </nav>

            {/* ── Mobile: ThemeToggle + Hamburger ── */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="scale-75">
                <ThemeToggle />
              </div>
              <button
                onClick={() => setIsMenuOpen(prev => !prev)}
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMenuOpen}
                className="p-2 rounded-lg text-white/90 hover:bg-white/10 hover:text-white transition-colors"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile Slide-Down Menu ── */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isMenuOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <nav className="px-4 pt-2 pb-4 space-y-1 border-t border-white/10">
            {navItems.filter(n => n.visible).map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={mobileLinkClass}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}

            {isAdmin && (
              <NavLink
                to="/admin"
                className={mobileLinkClass}
                onClick={() => setIsMenuOpen(false)}
              >
                <Shield className="h-4 w-4" />
                Admin Panel
              </NavLink>
            )}

            {/* Divider */}
            <div className="border-t border-white/10 my-2" />

            <button
              onClick={() => { handleLogout(); setIsMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-white/80 hover:bg-red-500/20 hover:text-white transition-all duration-200"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </nav>
        </div>
      </header>

      {/* ── Backdrop overlay for mobile ── */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
};