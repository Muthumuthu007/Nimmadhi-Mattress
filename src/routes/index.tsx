import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Dashboard from '../pages/Dashboard';
import GRN from '../pages/GRN';
import Inventory from '../pages/Inventory';
import Production from '../pages/Production';
import Costing from '../pages/Costing';
import Dispatched from '../pages/Dispatched';
import Reports from '../pages/Reports';
import DailyReport from '../pages/reports/DailyReport';
import WeeklyReport from '../pages/reports/WeeklyReport';
import MonthlyReport from '../pages/reports/MonthlyReport';
import DailyConsumption from '../pages/reports/DailyConsumption';
import WeeklyConsumption from '../pages/reports/WeeklyConsumption';
import MonthlyConsumption from '../pages/reports/MonthlyConsumption';
import Login from '../pages/Login';
import Admin from '../pages/Admin';
import ProtectedRoute from '../components/ProtectedRoute';
import AdminRoute from '../components/AdminRoute';
import PermissionGuard from '../components/PermissionGuard';
import SignUp from '../pages/SignUp';
import DispatchedDaily from '../pages/DispatchedDaily';
import DispatchedWeekly from '../pages/DispatchedWeekly';
import DispatchedMonthly from '../pages/DispatchedMonthly';
import DailyInward from '../pages/reports/DailyInward';
import WeeklyInward from '../pages/reports/WeeklyInward';
import MonthlyInward from '../pages/reports/MonthlyInward';
import MonthlyInwardGrid from '../pages/reports/MonthlyInwardGrid';
import MonthlyOutwardGrid from '../pages/reports/MonthlyOutwardGrid';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <SignUp />,
  },
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <Layout />
      </AdminRoute>
    ),
    children: [
      {
        index: true,
        element: <Admin />,
      },
    ],
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <PermissionGuard permission="dashboard">
            <Dashboard />
          </PermissionGuard>
        ),
      },
      {
        path: 'grn',
        element: (
          <PermissionGuard permission="grn">
            <GRN />
          </PermissionGuard>
        ),
      },
      {
        path: 'costing',
        element: (
          <PermissionGuard permission="costing">
            <Costing />
          </PermissionGuard>
        ),
      },
      {
        path: 'inventory',
        element: (
          <PermissionGuard permission="inventory">
            <Inventory />
          </PermissionGuard>
        ),
      },
      {
        path: 'production',
        element: (
          <PermissionGuard permission="production">
            <Production />
          </PermissionGuard>
        ),
      },
      {
        path: 'dispatched',
        element: (
          <PermissionGuard permission="dispatch">
            <Dispatched />
          </PermissionGuard>
        ),
        children: [
          {
            path: 'daily',
            element: <DispatchedDaily />,
          },
          {
            path: 'weekly',
            element: <DispatchedWeekly />,
          },
          {
            path: 'monthly',
            element: <DispatchedMonthly />,
          },
        ],
      },
      {
        path: 'reports',
        element: (
          <PermissionGuard permission="reports">
            <Reports />
          </PermissionGuard>
        ),
        children: [
          {
            index: true,
            element: <Navigate to="daily" replace />, // Optional: Redirect to first report sub-tab
          },
          {
            path: 'daily',
            element: <DailyReport />,
          },
          {
            path: 'weekly',
            element: <WeeklyReport />,
          },
          {
            path: 'monthly',
            element: <MonthlyReport />,
          },
          {
            path: 'consumption/daily',
            element: <DailyConsumption />,
          },
          {
            path: 'consumption/weekly',
            element: <WeeklyConsumption />,
          },
          {
            path: 'consumption/monthly',
            element: <MonthlyConsumption />,
          },
          {
            path: 'inward/daily',
            element: <DailyInward />,
          },
          {
            path: 'inward/weekly',
            element: <WeeklyInward />,
          },
          {
            path: 'inward/monthly',
            element: <MonthlyInward />,
          },
          {
            path: 'inward-outward/inward',
            element: <MonthlyInwardGrid />,
          },
          {
            path: 'inward-outward/outward',
            element: <MonthlyOutwardGrid />,
          },
        ],
      },
    ],
  },
]);