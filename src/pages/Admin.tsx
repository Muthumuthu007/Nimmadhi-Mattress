import React, { useState } from 'react';
import {
  Trash2, Users, Key, Eye, EyeOff, Search, AlertCircle,
  Loader2, CheckCircle, UserPlus, Menu, X, Shield, Lock
} from 'lucide-react';
import { axiosInstance } from '../utils/axiosInstance';
import { AdminSkeleton } from '../components/skeletons/AdminSkeleton';

interface User {
  username: string;
  role: string;
}

interface PasswordChangeForm {
  adminUsername: string;
  adminPassword: string;
  username: string;
  newPassword: string;
  confirmPassword: string;
}

interface CreateUserForm {
  username: string;
  password: string;
  confirmPassword: string;
  permissions: string[];
}

interface UpdatePermissionsForm {
  username: string;
  permissions: string[];
}

const AVAILABLE_PERMISSIONS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'grn', label: 'GRN' },
  { id: 'costing', label: 'Costing' },
  { id: 'production', label: 'Production' },
  { id: 'dispatch', label: 'Dispatch' },
  { id: 'reports', label: 'Reports' },
  { id: 'admin', label: 'Admin Panel' }
];

const Admin = () => {
  const [selectedSection, setSelectedSection] = useState<string>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordChangeForm>({
    adminUsername: '',
    adminPassword: '',
    username: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [createUserForm, setCreateUserForm] = useState<CreateUserForm>({
    username: '',
    password: '',
    confirmPassword: '',
    permissions: []
  });
  const [updatePermissionsForm, setUpdatePermissionsForm] = useState<UpdatePermissionsForm>({
    username: '',
    permissions: []
  });

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showCreateConfirmPassword, setShowCreateConfirmPassword] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [isDeletingTransaction, setIsDeletingTransaction] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewUsersAdminUsername, setViewUsersAdminUsername] = useState('');
  const [viewUsersAdminPassword, setViewUsersAdminPassword] = useState('');
  const [showViewUsersAdminPassword, setShowViewUsersAdminPassword] = useState(false);

  const sections = [
    { id: 'transactions', label: 'Delete Transaction', icon: Trash2 },
    { id: 'users', label: 'View Users', icon: Users },
    { id: 'password', label: 'Change Password', icon: Key },
    { id: 'permissions', label: 'Update Permissions', icon: Shield },
    { id: 'create', label: 'Create User', icon: UserPlus }
  ];

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post('/api/users/admin/view/', {
        username: viewUsersAdminUsername,
        password: viewUsersAdminPassword
      });
      setUsers(response.data);
    } catch (error: any) {
      setError(error?.message || 'Failed to fetch users');
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchUsers();
  };



  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setSuccessMessage(null);

    if (createUserForm.password !== createUserForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (createUserForm.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsCreatingUser(true);

    try {
      const response = await axiosInstance.post('/api/users/register/', {
        username: createUserForm.username,
        password: createUserForm.password,
        permissions: createUserForm.permissions
      });

      if (response.data && response.data.message) {
        setSuccessMessage(`User '${response.data.username}' registered successfully.`);
        setCreateUserForm({
          username: '',
          password: '',
          confirmPassword: '',
          permissions: []
        });
        // Optionally refresh the users list if admin credentials are available
        if (viewUsersAdminUsername && viewUsersAdminPassword) {
          await fetchUsers();
        }
      }
    } catch (error: any) {
      if (error?.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError(error?.message || 'Failed to create user');
      }
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleUpdatePermissions = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setSuccessMessage(null);
    setIsUpdatingPermissions(true);

    try {
      const response = await axiosInstance.post('/api/users/update-permissions/', {
        username: updatePermissionsForm.username,
        permissions: updatePermissionsForm.permissions
      });

      if (response.data && response.data.message) {
        setSuccessMessage(response.data.message);
        setUpdatePermissionsForm({
          username: '',
          permissions: []
        });
      }
    } catch (error: any) {
      setError(error?.response?.data?.error || error?.message || 'Failed to update permissions');
    } finally {
      setIsUpdatingPermissions(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);
    setSuccessMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await axiosInstance.post('/api/users/admin/update/', {
        username: passwordForm.adminUsername,
        password: passwordForm.adminPassword,
        username_to_update: passwordForm.username,
        new_password: passwordForm.newPassword
      });

      if (response.data && response.data.message) {
        setSuccessMessage(response.data.message);
        setPasswordForm({
          adminUsername: '',
          adminPassword: '',
          username: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error: any) {
      setError(error?.response?.data?.error || error?.message || 'Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };



  const handleDeleteTransaction = async () => {
    setIsDeletingTransaction(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await axiosInstance.post('/api/undo/admin/delete-transactions/', {
        username: "admin",
        confirm: "DELETE_ALL_TRANSACTIONS"
      });

      if (response.data) {
        setSuccessMessage(response.data.message || 'All transactions deleted successfully');
      }
    } catch (error: any) {
      if (error?.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError(error?.message || 'Failed to delete transactions');
      }
    } finally {
      setIsDeletingTransaction(false);
      setShowDeleteConfirmDialog(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
        {/* Mobile Navigation */}
        <div className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'} border-b border-gray-200 dark:border-gray-700`}>
          <div className="p-4 space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  setSelectedSection(section.id);
                  setIsMobileMenuOpen(false);
                  setError(null);
                  setSuccessMessage(null);
                }}
                className={`w-full flex items-center space-x-2 px-4 py-3 rounded-lg transition-colors ${selectedSection === section.id
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
              >
                <section.icon className="h-5 w-5" />
                <span className="font-medium">{section.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex border-b border-gray-200 dark:border-gray-700">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                setSelectedSection(section.id);
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 px-4 py-3 flex items-center justify-center space-x-2 transition-colors ${selectedSection === section.id
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
            >
              <section.icon className="h-5 w-5" />
              <span className="font-medium hidden lg:inline">{section.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {selectedSection === 'transactions' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg transition-colors">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Delete Transaction</h2>

              {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-400 dark:border-red-500 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-300 mr-2" />
                      <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                    <button
                      onClick={() => setError(null)}
                      className="text-red-400 dark:text-red-300 hover:text-red-600 dark:hover:text-red-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex">
                      <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                      <p className="text-sm text-green-700">{successMessage}</p>
                    </div>
                    <button
                      onClick={() => setSuccessMessage(null)}
                      className="text-green-400 hover:text-green-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowDeleteConfirmDialog(true)}
                disabled={isDeletingTransaction}
                className={`w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center justify-center ${isDeletingTransaction ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
              >
                <Trash2 className="h-5 w-5 mr-2" />
                Delete Transaction
              </button>

              {showDeleteConfirmDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700 shadow-xl">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Warning</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      Warning: This action cannot be undone. The transaction will be permanently removed from the system.
                      Are you sure you want to delete the transaction?
                    </p>
                    <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                      <button
                        onClick={() => setShowDeleteConfirmDialog(false)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 w-full sm:w-auto"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteTransaction}
                        disabled={isDeletingTransaction}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center w-full sm:w-auto"
                      >
                        {isDeletingTransaction ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedSection === 'users' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg transition-colors">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">View Users</h2>

              {error && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                    <button
                      onClick={() => setError(null)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleViewUsers} className="space-y-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Admin Username</label>
                    <input
                      type="text"
                      placeholder="Enter admin username"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300"
                      value={viewUsersAdminUsername}
                      onChange={(e) => setViewUsersAdminUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Admin Password</label>
                    <div className="relative">
                      <input
                        type={showViewUsersAdminPassword ? "text" : "password"}
                        placeholder="Enter admin password"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 pr-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300"
                        value={viewUsersAdminPassword}
                        onChange={(e) => setViewUsersAdminPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowViewUsersAdminPassword(!showViewUsersAdminPassword)}
                      >
                        {showViewUsersAdminPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Loading Users...
                    </>
                  ) : (
                    <>
                      <Users className="h-5 w-5 mr-2" />
                      View Users
                    </>
                  )}
                </button>
              </form>

              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex">
                        <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                      <button
                        onClick={() => setError(null)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {isLoading ? (
                  <AdminSkeleton />
                ) : (
                  <div className="overflow-x-auto">
                    <div className="inline-block min-w-full align-middle">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Username
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                              Role
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {filteredUsers.map((user, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {user.username}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                                  }`}>
                                  {user.role}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {filteredUsers.length === 0 && !isLoading && (
                        <div className="text-center py-8 text-gray-500">
                          {searchQuery ? 'No users match your search' : 'No users found'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedSection === 'password' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg transition-colors">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Change User Password</h2>

              {error && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                    <button
                      onClick={() => setError(null)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex">
                      <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                      <p className="text-sm text-green-700">{successMessage}</p>
                    </div>
                    <button
                      onClick={() => setSuccessMessage(null)}
                      className="text-green-400 hover:text-green-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Admin Username</label>
                  <input
                    type="text"
                    placeholder="Enter admin username"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300"
                    value={passwordForm.adminUsername}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, adminUsername: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Admin Password</label>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? "text" : "password"}
                      placeholder="Enter admin password"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 pr-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300"
                      value={passwordForm.adminPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, adminPassword: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                    >
                      {showAdminPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username to Update</label>
                  <input
                    type="text"
                    placeholder="Enter username"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300"
                    value={passwordForm.username}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, username: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 pr-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 pr-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className={`w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center ${isChangingPassword ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                >
                  {isChangingPassword ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Key className="h-5 w-5 mr-2" />
                  )}
                  {isChangingPassword ? 'Updating Password...' : 'Change Password'}
                </button>
              </form>
            </div>
          )}



          {selectedSection === 'create' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg transition-colors">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Create New User</h2>

              {error && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                    <button
                      onClick={() => setError(null)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex">
                      <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                      <p className="text-sm text-green-700">{successMessage}</p>
                    </div>
                    <button
                      onClick={() => setSuccessMessage(null)}
                      className="text-green-400 hover:text-green-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                  <input
                    type="text"
                    placeholder="Enter username"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300"
                    value={createUserForm.username}
                    onChange={(e) => setCreateUserForm(prev => ({ ...prev, username: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Permissions</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    {AVAILABLE_PERMISSIONS.map((perm) => (
                      <label key={perm.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={createUserForm.permissions.includes(perm.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCreateUserForm(prev => ({
                                ...prev,
                                permissions: [...prev.permissions, perm.id]
                              }));
                            } else {
                              setCreateUserForm(prev => ({
                                ...prev,
                                permissions: prev.permissions.filter(p => p !== perm.id)
                              }));
                            }
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-200">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showCreatePassword ? "text" : "password"}
                      placeholder="Enter password"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 pr-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300"
                      value={createUserForm.password}
                      onChange={(e) => setCreateUserForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                    >
                      {showCreatePassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showCreateConfirmPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 pr-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300"
                      value={createUserForm.confirmPassword}
                      onChange={(e) => setCreateUserForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowCreateConfirmPassword(!showCreateConfirmPassword)}
                    >
                      {showCreateConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className={`w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center ${isCreatingUser ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                >
                  {isCreatingUser ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <UserPlus className="h-5 w-5 mr-2" />
                  )}
                  {isCreatingUser ? 'Creating User...' : 'Create User'}
                </button>
              </form>
            </div>
          )}

          {selectedSection === 'permissions' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg transition-colors">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Update User Permissions</h2>

              {error && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                    <button
                      onClick={() => setError(null)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex">
                      <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                      <p className="text-sm text-green-700">{successMessage}</p>
                    </div>
                    <button
                      onClick={() => setSuccessMessage(null)}
                      className="text-green-400 hover:text-green-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleUpdatePermissions} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                  <input
                    type="text"
                    placeholder="Enter username"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300"
                    value={updatePermissionsForm.username}
                    onChange={(e) => setUpdatePermissionsForm(prev => ({ ...prev, username: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Permissions</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    {AVAILABLE_PERMISSIONS.map((perm) => (
                      <label key={perm.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={updatePermissionsForm.permissions.includes(perm.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setUpdatePermissionsForm(prev => ({
                                ...prev,
                                permissions: [...prev.permissions, perm.id]
                              }));
                            } else {
                              setUpdatePermissionsForm(prev => ({
                                ...prev,
                                permissions: prev.permissions.filter(p => p !== perm.id)
                              }));
                            }
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-200">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingPermissions}
                  className={`w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center ${isUpdatingPermissions ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                >
                  {isUpdatingPermissions ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Shield className="h-5 w-5 mr-2" />
                  )}
                  {isUpdatingPermissions ? 'Updating Permissions...' : 'Update Permissions'}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Admin;

