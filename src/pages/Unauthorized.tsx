import React from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * Shown when an authenticated user has no permissions matching any known
 * route (see getFirstAllowedRoute). This is a dead-end, not a redirect
 * target — routing here must never happen as a fallback inside a guard that
 * itself requires a permission, or it can loop back into that same guard.
 */
const Unauthorized: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-lg w-full p-8 text-center">
        <div className="h-16 w-16 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="h-8 w-8 text-amber-500 dark:text-amber-400" />
        </div>

        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          No access permissions
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Your account isn't assigned any page permissions yet. Contact an administrator to get access.
        </p>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Log out
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;
