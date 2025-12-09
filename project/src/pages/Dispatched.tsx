import React from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { Calendar, CalendarRange, FileText } from 'lucide-react';

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

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white dark:text-white">Dispatched Reports</h1>
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
      <Outlet />
    </div>
  );
};

export default Dispatched;