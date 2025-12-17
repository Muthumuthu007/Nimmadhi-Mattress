import React from 'react';
import ProtectedRoute from './ProtectedRoute';

interface AdminRouteProps {
    children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
    return (
        <ProtectedRoute requireAdmin={true}>
            {children}
        </ProtectedRoute>
    );
};

export default AdminRoute;
