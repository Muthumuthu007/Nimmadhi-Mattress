import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CalendarRange, FileText, TrendingDown, FileSpreadsheet } from 'lucide-react';

const Reports = () => {
  const navigate = useNavigate();

  const reportTypes = [
    {
      title: 'Production Reports',
      description: 'View detailed production statistics and metrics',
      items: [
        {
          id: 'daily',
          title: 'Daily Reports',
          description: 'View detailed daily production and inventory reports',
          icon: Calendar,
          path: '/dashboard/reports/daily',
        },
        {
          id: 'weekly',
          title: 'Weekly Reports',
          description: 'Analyze weekly trends and performance metrics',
          icon: CalendarRange,
          path: '/dashboard/reports/weekly',
        },
        {
          id: 'monthly',
          title: 'Monthly Reports',
          description: 'Track monthly production and inventory statistics',
          icon: FileText,
          path: '/dashboard/reports/monthly',
        },
      ]
    },
    {
      title: 'Consumption Reports',
      description: 'Track material usage and consumption patterns',
      items: [
        {
          id: 'daily-consumption',
          title: 'Daily Consumption',
          description: 'Monitor daily material consumption and costs',
          icon: Calendar,
          path: '/dashboard/reports/consumption/daily',
        },
        {
          id: 'weekly-consumption',
          title: 'Weekly Consumption',
          description: 'Analyze weekly material usage trends',
          icon: CalendarRange,
          path: '/dashboard/reports/consumption/weekly',
        },
        {
          id: 'monthly-consumption',
          title: 'Monthly Consumption',
          description: 'Track monthly consumption patterns and expenses',
          icon: TrendingDown,
          path: '/dashboard/reports/consumption/monthly',
        },
      ]
    },
    {
      title: 'Inward Reports',
      description: 'Track material inward entries and receipts',
      items: [
        {
          id: 'daily-inward',
          title: 'Daily Inward',
          description: 'Monitor daily material inward and receipts',
          icon: Calendar,
          path: '/dashboard/reports/inward/daily',
        },
        {
          id: 'weekly-inward',
          title: 'Weekly Inward',
          description: 'Analyze weekly inward material trends',
          icon: CalendarRange,
          path: '/dashboard/reports/inward/weekly',
        },
        {
          id: 'monthly-inward',
          title: 'Monthly Inward',
          description: 'Track monthly inward patterns and receipts',
          icon: FileText,
          path: '/dashboard/reports/inward/monthly',
        },
      ]
    },
    {
      title: 'MonthlyInward-OutwardGrid',
      description: 'View monthly inward and outward grid reports',
      items: [
        {
          id: 'monthly-inward-grid',
          title: 'MonthlyInwardGrid',
          description: 'View monthly inward grid report',
          icon: FileSpreadsheet,
          path: '/dashboard/reports/inward-outward/inward',
        },
        {
          id: 'monthly-outward-grid',
          title: 'MonthlyOutwardgrid',
          description: 'View monthly outward grid report',
          icon: FileSpreadsheet,
          path: '/dashboard/reports/inward-outward/outward',
        },
      ]
    }
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
      </div>

      {reportTypes.map((section, index) => (
        <div key={index} className="space-y-4">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{section.title}</h2>
            <p className="text-gray-600 dark:text-gray-300">{section.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {section.items.map((report) => {
              const Icon = report.icon;
              return (
                <button
                  key={report.id}
                  onClick={() => navigate(report.path)}
                  className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 text-left group"
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
      ))}
    </div>
  );
};

export default Reports;