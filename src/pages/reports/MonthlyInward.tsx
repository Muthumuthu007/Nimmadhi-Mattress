import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Download, Loader2, RefreshCw, ArrowLeft, AlertCircle, FileText, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { axiosInstance } from '../../utils/axiosInstance';
import * as XLSX from 'xlsx';
import { ReportSkeleton } from '../../components/skeletons/ReportSkeleton';

const MonthlyInward = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [search, setSearch] = useState('');

  const fetchReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post('/api/reports/inward/monthly/', {
        month: selectedMonth
      });
      setReportData(response.data);
    } catch (error: any) {
      setError(error?.message || 'Failed to fetch monthly inward report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!reportData || !reportData.inward) return;
    const rows: any[] = [];
    Object.entries(reportData.inward).forEach(([date, groups]: [string, any]) => {
      Object.entries(groups).forEach(([group, categories]: [string, any]) => {
        Object.entries(categories).forEach(([category, entries]) => {
          (entries as any[]).forEach((entry: any) => {
            rows.push({
              'Date': date,
              'Group': group,
              'Subgroup': category,
              'Category': category,
              'Stock Name': entry.stock_name,
              'Existing Qty': entry.existing_quantity,
              'Inward Qty': entry.inward_quantity,
              'New Qty': entry.new_quantity,
              'Added Cost': entry.added_cost,
            });
          });
        });
      });
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Inward');
    XLSX.writeFile(workbook, `monthly-inward-${selectedMonth}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard/reports')}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Reports
          </button>
          <h1 className="text-2xl font-bold dark:text-white">Monthly Inward Report</h1>
        </div>
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm w-full sm:w-auto border border-gray-200 dark:border-gray-700">
            <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            <input
              type="month"
              className="border-none focus:ring-0 text-sm w-full bg-transparent dark:text-white"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              title="Select month"
              placeholder="Select month"
            />
          </div>
          <button
            onClick={fetchReport}
            disabled={isLoading}
            className={`flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors min-w-[140px] ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {isLoading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <RefreshCw className="h-5 w-5 mr-2" />}
            {isLoading ? 'Loading...' : 'Generate Report'}
          </button>
          <button
            onClick={handleDownload}
            disabled={!reportData || !reportData.inward}
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            title="Download Excel"
          >
            <Download className="w-5 h-5 mr-1" /> Download
          </button>
        </div>
      </div>
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-500 p-4 rounded-r-lg">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-500" />
            <p className="ml-3 text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}
      {isLoading ? (
        <ReportSkeleton />
      ) : reportData && reportData.inward && Object.entries(reportData.inward).length > 0 ? (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center mb-6">
                <BarChart3 className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-2" />
                <h2 className="text-xl font-semibold dark:text-white">Inward Entries</h2>
                <span className="ml-4 text-sm text-gray-500 dark:text-gray-400">
                  {reportData.report_period && (
                    <>
                      {reportData.report_period.start_date === reportData.report_period.end_date
                        ? `(${format(new Date(reportData.report_period.start_date), 'MMMM yyyy')})`
                        : `(${format(new Date(reportData.report_period.start_date), 'MMM d, yyyy')} - ${format(new Date(reportData.report_period.end_date), 'MMM d, yyyy')})`}
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center mb-2">
                <input
                  type="text"
                  className="border rounded px-3 py-2 text-sm w-full max-w-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  placeholder="Search by Stock Name..."
                  title="Search by Stock Name"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {Object.entries(reportData.inward).map(([date, groups]: [string, any]) => (
                Object.keys(groups).length > 0 && (
                  <div key={date} className="mb-8">
                    <div className="text-md font-semibold text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-2">
                      <Calendar className="inline h-5 w-5 text-indigo-400 dark:text-indigo-500" />
                      {format(new Date(date), 'MMMM d, yyyy')}
                    </div>
                    {Object.entries(groups).map(([group, categories]: [string, any]) => (
                      <div key={group} className="mb-4">
                        <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">{group}</div>
                        {Object.entries(categories).map(([category, entries]) => (
                          <div key={category} className="mb-2">
                            <div className="font-medium text-gray-600 dark:text-gray-400 mb-1">{category}</div>
                            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                              <table className="min-w-full rounded-lg shadow bg-white dark:bg-gray-800 mb-4">
                                <thead className="bg-indigo-50 dark:bg-indigo-900/20">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">Stock Name</th>
                                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Existing Qty</th>
                                    <th className="px-4 py-2 text-right text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">Inward Qty</th>
                                    <th className="px-4 py-2 text-right text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">New Qty</th>
                                    <th className="px-4 py-2 text-right text-xs font-bold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider">Added Cost</th>
                                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                  {(entries as any[])
                                    .filter(entry => entry.stock_name.toLowerCase().includes(search.toLowerCase()))
                                    .map((entry, idx) => (
                                      <tr key={idx} className="hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                                        <td className="px-4 py-2 font-semibold text-indigo-900 dark:text-indigo-300">{entry.stock_name}</td>
                                        <td className="px-4 py-2 text-right text-gray-800 dark:text-gray-200">{entry.existing_quantity}</td>
                                        <td className="px-4 py-2 text-right text-green-700 dark:text-green-400 font-bold">+{entry.inward_quantity}</td>
                                        <td className="px-4 py-2 text-right text-blue-700 dark:text-blue-400 font-bold">{entry.new_quantity}</td>
                                        <td className="px-4 py-2 text-right text-yellow-700 dark:text-yellow-400 font-bold">₹{entry.added_cost.toLocaleString()}</td>
                                        <td className="px-4 py-2 text-right text-gray-500 dark:text-gray-400">{format(new Date(entry.date), 'MMM d, yyyy')}</td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )
              ))}
              {Object.values(reportData.inward).every((entries: any) => !Array.isArray(entries) || entries.length === 0) && (
                <div className="text-center text-gray-400 text-sm py-8">No inward data found for this month.</div>
              )}
            </div>
          </div>
        </div>
      ) : !isLoading && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <FileText className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No Inward Data Available</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Select a month and click "Generate Report" to view inward data
          </p>
        </div>
      )}
    </div>
  );
};

export default MonthlyInward;
