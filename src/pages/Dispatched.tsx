import React from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { Calendar, CalendarRange, FileText, LayoutGrid } from 'lucide-react';

const Dispatched = () => {
  const navigate = useNavigate();

  const dispatchedReports = [
    {
      id: 'daily-dispatched',
      title: 'Daily Dispatched',
      description: 'View daily dispatched production records',
      icon: Calendar,
      path: '/dashboard/dispatched/daily',
    },
    {
      id: 'weekly-dispatched',
      title: 'Weekly Dispatched',
      description: 'Analyze weekly dispatched production records',
      icon: CalendarRange,
      path: '/dashboard/dispatched/weekly',
    },
    {
      id: 'monthly-dispatched',
      title: 'Monthly Dispatched',
      description: 'Track monthly dispatched production records',
      icon: FileText,
      path: '/dashboard/dispatched/monthly',
    },
  ];

  const groupedReports = [
    {
      id: 'daily-grouped',
      title: 'Daily Grouped',
      description: 'Category-wise breakdown of daily dispatches',
      icon: Calendar,
      path: '/dashboard/dispatched/daily-grouped',
      color: 'violet',
    },
    {
      id: 'weekly-grouped',
      title: 'Weekly Grouped',
      description: 'Category-wise breakdown of weekly dispatches',
      icon: CalendarRange,
      path: '/dashboard/dispatched/weekly-grouped',
      color: 'fuchsia',
    },
    {
      id: 'monthly-grouped',
      title: 'Monthly Grouped',
      description: 'Category-wise breakdown of monthly dispatches',
      icon: FileText,
      path: '/dashboard/dispatched/monthly-grouped',
      color: 'rose',
    },
  ];

  const iconColorMap: Record<string, string> = {
    violet: 'bg-violet-100 dark:bg-violet-900/30 group-hover:bg-violet-200 dark:group-hover:bg-violet-900/50 text-violet-600 dark:text-violet-400',
    fuchsia: 'bg-fuchsia-100 dark:bg-fuchsia-900/30 group-hover:bg-fuchsia-200 dark:group-hover:bg-fuchsia-900/50 text-fuchsia-600 dark:text-fuchsia-400',
    rose: 'bg-rose-100 dark:bg-rose-900/30 group-hover:bg-rose-200 dark:group-hover:bg-rose-900/50 text-rose-600 dark:text-rose-400',
  };

  const titleColorMap: Record<string, string> = {
    violet: 'group-hover:text-violet-600 dark:group-hover:text-violet-400',
    fuchsia: 'group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400',
    rose: 'group-hover:text-rose-600 dark:group-hover:text-rose-400',
  };

  return (
    <div className="space-y-8">
      {/* ── Existing Reports ── */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dispatched Reports</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {dispatchedReports.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.id}
                onClick={() => navigate(report.path)}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 text-left group border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/50 transition-colors">
                    <Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {report.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {report.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Grouped Dispatch Reports — Separate Section ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <LayoutGrid className="h-5 w-5 text-gray-500 dark:text-white/80" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Grouped Dispatch Reports</h2>
          <span className="px-2 py-0.5 bg-gray-200 dark:bg-white/20 text-gray-700 dark:text-white text-xs font-semibold rounded-full">Category View</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {groupedReports.map((report) => {
            const Icon = report.icon;
            const iconCls = iconColorMap[report.color] ?? iconColorMap.violet;
            const titleCls = titleColorMap[report.color] ?? titleColorMap.violet;
            return (
              <button
                key={report.id}
                onClick={() => navigate(report.path)}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 text-left group border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg transition-colors ${iconCls}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold text-gray-900 dark:text-white transition-colors ${titleCls}`}>
                      {report.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {report.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Outlet />
    </div>
  );
};

export default Dispatched;