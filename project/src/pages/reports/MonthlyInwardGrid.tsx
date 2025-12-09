import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '../../utils/axiosInstance';
import { FileSpreadsheet, Loader2, ArrowLeft, Download } from 'lucide-react';
import { format, parse, getDaysInMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import { ReportSkeleton } from '../../components/skeletons/ReportSkeleton';

interface InwardItem {
  item_id: string;
  item_name: string;
  opening_balance: number;
  inward_days: { [day: string]: number };
  total_inward: number;
}

interface GridData {
  [category: string]: InwardItem[];
}

interface ApiResponse {
  month: string;
  type: string;
  grid_data: GridData;
  monthly_total: number;
}

const MonthlyInwardGrid = () => {
  const navigate = useNavigate();
  const [month, setMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    if (!month) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      console.log("Making request to: /api/reports/inward/monthly-grid/");
      const response = await axiosInstance.post('/api/reports/inward/monthly-grid/', {
        operation: "GetMonthlyInwardGrid",
        month: month
      });

      setData(response.data);
    } catch (err: any) {
      console.error("Error fetching report:", err);
      setError(err.message || 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!data || !data.grid_data) return;

    const daysInMonth = getDaysInMonth(parse(month, 'yyyy-MM', new Date()));
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const monthName = format(parse(month, 'yyyy-MM', new Date()), 'MMM -yy').toUpperCase();

    // Create worksheet data
    const wsData: any[][] = [];

    // Title row
    wsData.push([`SOFTFOAM AND LATEX IN FOR THE MONTH OF ${monthName}`]);

    // Header row
    const headerRow = ['DESCRIPTION', 'O/B NO', ...daysArray.map(d => d.toString()), 'TOTAL'];
    wsData.push(headerRow);

    // Data rows
    Object.entries(data.grid_data).forEach(([category, items]) => {
      // Category header row
      wsData.push([category, '', ...daysArray.map(d => d.toString()), '']);

      // Item rows
      items.forEach((item) => {
        const row = [
          item.item_name,
          item.opening_balance > 0 ? item.opening_balance : '-',
          ...daysArray.map(day => item.inward_days[day] || ''),
          item.total_inward
        ];
        wsData.push(row);
      });
    });

    // Monthly total row
    const totalRow = ['MONTHLY TOTAL', '', ...daysArray.map(() => ''), data.monthly_total];
    wsData.push(totalRow);

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    const colWidths = [{ wch: 25 }, { wch: 10 }, ...daysArray.map(() => ({ wch: 8 })), { wch: 12 }];
    ws['!cols'] = colWidths;

    // Merge title cell
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headerRow.length - 1 } }];

    XLSX.utils.book_append_sheet(wb, ws, 'Monthly Inward');
    XLSX.writeFile(wb, `monthly-inward-grid-${month}.xlsx`);
  };

  const renderTable = () => {
    if (!data || !data.grid_data) return null;

    const daysInMonth = getDaysInMonth(parse(month, 'yyyy-MM', new Date()));
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const monthName = format(parse(month, 'yyyy-MM', new Date()), 'MMM -yy').toUpperCase();

    return (
      <div className="overflow-x-auto border rounded-lg shadow-sm mt-6 border-gray-200 dark:border-gray-700">
        <table className="min-w-full border-collapse border border-gray-400 dark:border-gray-600 text-xs">
          <thead>
            <tr className="bg-yellow-300 dark:bg-yellow-900/50 text-center font-bold border border-gray-400 dark:border-gray-600">
              <th colSpan={2 + daysInMonth + 1} className="py-2 border border-gray-400 dark:border-gray-600 text-black dark:text-white">
                SOFTFOAM AND LATEX IN FOR THE MONTH OF {monthName}
              </th>
            </tr>
            <tr className="bg-yellow-300 dark:bg-yellow-900/50 text-center font-bold text-[10px] border border-gray-400 dark:border-gray-600">
              <th className="border border-gray-400 dark:border-gray-600 px-1 py-1 min-w-[150px] text-left text-black dark:text-white">DESCRIPTION</th>
              <th className="border border-gray-400 dark:border-gray-600 px-1 py-1 w-12 text-black dark:text-white">O/B NO</th>
              {daysArray.map(day => (
                <th key={day} className="border border-gray-400 dark:border-gray-600 px-1 py-1 w-8 text-black dark:text-white">{day}</th>
              ))}
              <th className="border border-gray-400 dark:border-gray-600 px-1 py-1 w-16 text-black dark:text-white">TOTAL</th>
            </tr>
          </thead>
          <tbody className="dark:bg-gray-800">
            {Object.entries(data.grid_data).map(([category, items]) => (
              <React.Fragment key={category}>
                <tr className="bg-yellow-300 dark:bg-yellow-900/50 font-bold border border-gray-400 dark:border-gray-600">
                  <td className="border border-gray-400 dark:border-gray-600 px-2 py-1 text-left text-black dark:text-white" colSpan={2}>
                    {category}
                  </td>
                  {daysArray.map(day => (
                    <td key={`cat-${category}-${day}`} className="border border-gray-400 dark:border-gray-600 px-1 py-1 text-center text-[10px] text-black dark:text-white">
                      {day}
                    </td>
                  ))}
                  <td className="border border-gray-400 dark:border-gray-600 px-1 py-1"></td>
                </tr>
                {items.map((item) => (
                  <tr key={item.item_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-gray-400 dark:border-gray-600">
                    <td className="border border-gray-400 dark:border-gray-600 px-2 py-1 font-medium text-left whitespace-nowrap text-gray-900 dark:text-gray-200">
                      {item.item_name}
                    </td>
                    <td className="border border-gray-400 dark:border-gray-600 px-1 py-1 text-center text-gray-600 dark:text-gray-400">
                      {item.opening_balance > 0 ? item.opening_balance : '-'}
                    </td>
                    {daysArray.map(day => (
                      <td key={day} className={`border border-gray-400 dark:border-gray-600 px-1 py-1 text-center ${item.inward_days[day] ? 'font-semibold text-gray-900 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600'}`}>
                        {item.inward_days[day] || ''}
                      </td>
                    ))}
                    <td className="border border-gray-400 dark:border-gray-600 px-1 py-1 text-center font-bold bg-yellow-100 dark:bg-yellow-900/30 text-black dark:text-white">
                      {item.total_inward}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
            <tr className="bg-yellow-300 dark:bg-yellow-900/50 font-bold border border-gray-400 dark:border-gray-600">
              <td className="border border-gray-400 dark:border-gray-600 px-2 py-1 text-right text-black dark:text-white" colSpan={2 + daysInMonth}>
                MONTHLY TOTAL
              </td>
              <td className="border border-gray-400 dark:border-gray-600 px-1 py-1 text-center text-black dark:text-white">
                {data.monthly_total}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard/reports')}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Reports
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Monthly Inward Grid</h1>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-end gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={loading || !month}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 mr-2" />
            )}
            Generate Report
          </button>
          <button
            onClick={handleDownloadExcel}
            disabled={!data}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Excel
          </button>
        </div>

        {error && (
          <div className="p-4 mb-4 text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded-lg" role="alert">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}

        {loading ? (
          <ReportSkeleton />
        ) : renderTable()}

        {!data && !loading && !error && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Select a month and click "Generate Report" to view the data.
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyInwardGrid;
