import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Download, Loader2, RefreshCw, ArrowLeft,
  AlertCircle, Package, FileText, BarChart3, TrendingDown, TrendingUp
} from 'lucide-react';
import { axiosInstance } from '../../utils/axiosInstance';
import { ReportSkeleton } from '../../components/skeletons/ReportSkeleton';
import { formatApiDate } from '../../utils/dateUtils';
import ScrollToTopButton from '../../components/ScrollToTopButton';

// Types for the updated API response structure.
// stock_summary is now a flat category -> subcategory -> items hierarchy
// (no date nesting). The response also includes report_period,
// total_inward_quantity and total_inward_amount fields.
interface ConsumptionItem {
  item_id: string;
  total_quantity_consumed?: number | null;
  total_quantity_added?: number | null;
  total_added_cost?: number | null;
  suppliers?: string[] | null;
}

type SubCategoryMap = { [subcategory: string]: ConsumptionItem[] };
type CategoryMap = { [category: string]: SubCategoryMap };

interface ReportPeriod {
  start_date: string;
  end_date: string;
}

interface WeeklyConsumptionData {
  report_date: string;
  report_period: ReportPeriod;
  stock_summary: CategoryMap;
  total_consumption_quantity: number;
  total_consumption_amount: number;
  total_inward_quantity: number;
  total_inward_amount: number;
}

// Utility to ensure a value is always an array
function safeArray<T>(val: unknown): T[] {
  return Array.isArray(val) ? val : [];
}

// Missing/null numeric fields render as 0 rather than "NaN" or blank.
const safeNumber = (value: number | null | undefined): number =>
  typeof value === 'number' && !Number.isNaN(value) ? value : 0;

const WeeklyConsumption = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<string>(formatApiDate(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(formatApiDate(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consumptionData, setConsumptionData] = useState<WeeklyConsumptionData | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ field: 'item_id' | 'total_quantity_consumed' | 'total_quantity_added' | 'total_added_cost'; dir: 'asc' | 'desc' }>({ field: 'item_id', dir: 'asc' });

  const fetchConsumption = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.post('/api/stock/reports/weekly-consumption/', {
        start_date: startDate,
        end_date: endDate
      });

      setConsumptionData(response.data);
    } catch (error: any) {
      setError(error?.response?.data?.message || error?.message || 'Failed to fetch consumption data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!consumptionData) return;
    setIsDownloading(true);
    try {
      const period = consumptionData.report_period;
      const rows: string[][] = [
        ['Weekly Consumption Summary'],
        [`Report Date: ${consumptionData.report_date}`],
        [`Period: ${period?.start_date ?? startDate} to ${period?.end_date ?? endDate}`],
        [''],
        ['Category', 'Subcategory', 'Material ID', 'Quantity Consumed', 'Quantity Added', 'Added Cost (₹)', 'Suppliers'],
      ];
      Object.entries(consumptionData.stock_summary ?? {}).forEach(([category, subcats]) => {
        Object.entries(subcats ?? {}).forEach(([subcategory, items]) => {
          safeArray<ConsumptionItem>(items).forEach(item => {
            rows.push([
              category,
              subcategory,
              item.item_id ?? '',
              safeNumber(item.total_quantity_consumed).toString(),
              safeNumber(item.total_quantity_added).toString(),
              safeNumber(item.total_added_cost).toString(),
              (item.suppliers ?? []).join('; '),
            ]);
          });
        });
      });
      rows.push(['']);
      rows.push(['Totals']);
      rows.push(['Total Consumption Quantity', '', '', safeNumber(consumptionData.total_consumption_quantity).toString()]);
      rows.push(['Total Consumption Amount (₹)', '', '', safeNumber(consumptionData.total_consumption_amount).toString()]);
      rows.push(['Total Inward Quantity', '', '', safeNumber(consumptionData.total_inward_quantity).toString()]);
      rows.push(['Total Inward Amount (₹)', '', '', safeNumber(consumptionData.total_inward_amount).toString()]);

      const csvContent = rows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const periodStart = period?.start_date ?? startDate;
      const periodEnd = period?.end_date ?? endDate;
      link.download = `weekly-consumption-${periodStart}-to-${periodEnd}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      setError('Failed to download report');
    } finally {
      setIsDownloading(false);
    }
  };

  type SortState = { field: 'item_id' | 'total_quantity_consumed' | 'total_quantity_added' | 'total_added_cost'; dir: 'asc' | 'desc' };

  // Renders the consumption breakdown from the new stock_summary structure:
  // category -> subcategory -> items[] (no date nesting).
  function renderStockSummary(
    stock_summary: CategoryMap,
    search: string,
    sort: SortState,
    setSort: React.Dispatch<React.SetStateAction<SortState>>
  ) {
    const catEntries = Object.entries(stock_summary ?? {});
    if (catEntries.length === 0) return null;

    return catEntries.map(([category, subcats]) => {
      const subcategoryBlocks = Object.entries(subcats ?? {}).map(([subcategory, items]) => {
        const filteredItems: ConsumptionItem[] = safeArray<ConsumptionItem>(items)
          .filter(item => (item.item_id ?? '').toLowerCase().includes(search.toLowerCase()))
          .sort((a, b) => {
            let aVal: string | number = a[sort.field] ?? (sort.field === 'item_id' ? '' : 0);
            let bVal: string | number = b[sort.field] ?? (sort.field === 'item_id' ? '' : 0);
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();
            if (aVal < bVal) return sort.dir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sort.dir === 'asc' ? 1 : -1;
            return 0;
          });

        if (filteredItems.length === 0) return null;

        return (
          <div key={subcategory} className="mb-4">
            <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{subcategory}</h5>
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => setSort(s => ({ field: 'item_id', dir: s.field === 'item_id' && s.dir === 'asc' ? 'desc' : 'asc' }))}
                    >
                      Material ID
                      {sort.field === 'item_id' ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => setSort(s => ({ field: 'total_quantity_consumed', dir: s.field === 'total_quantity_consumed' && s.dir === 'asc' ? 'desc' : 'asc' }))}
                    >
                      Quantity Consumed
                      {sort.field === 'total_quantity_consumed' ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => setSort(s => ({ field: 'total_quantity_added', dir: s.field === 'total_quantity_added' && s.dir === 'asc' ? 'desc' : 'asc' }))}
                    >
                      Quantity Added
                      {sort.field === 'total_quantity_added' ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => setSort(s => ({ field: 'total_added_cost', dir: s.field === 'total_added_cost' && s.dir === 'asc' ? 'desc' : 'asc' }))}
                    >
                      Added Cost
                      {sort.field === 'total_added_cost' ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Suppliers
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredItems.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {item.item_id || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                        {safeNumber(item.total_quantity_consumed).toLocaleString()} units
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                        {safeNumber(item.total_quantity_added).toLocaleString()} units
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                        ₹{safeNumber(item.total_added_cost).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item.suppliers && item.suppliers.length > 0 ? item.suppliers.join(', ') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Total
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                      {filteredItems.reduce((sum, item) => sum + safeNumber(item.total_quantity_consumed), 0).toLocaleString()} units
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                      {filteredItems.reduce((sum, item) => sum + safeNumber(item.total_quantity_added), 0).toLocaleString()} units
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                      ₹{filteredItems.reduce((sum, item) => sum + safeNumber(item.total_added_cost), 0).toLocaleString()}
                    </th>
                    <th></th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      });

      const visibleSubcategoryBlocks = subcategoryBlocks.filter(Boolean);
      if (visibleSubcategoryBlocks.length === 0) return null;

      return (
        <div key={category} className="mb-6">
          <h4 className="text-md font-semibold text-indigo-700 dark:text-indigo-400 mb-2">{category}</h4>
          {visibleSubcategoryBlocks}
        </div>
      );
    });
  }

  const period = consumptionData?.report_period;
  const periodLabel = period
    ? `${formatApiDate(period.start_date, 'MMMM d')} – ${formatApiDate(period.end_date, 'MMMM d, yyyy')}`
    : `${formatApiDate(startDate, 'MMMM d')} – ${formatApiDate(endDate, 'MMMM d, yyyy')}`;

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
          <h1 className="text-2xl font-bold dark:text-white">Weekly Consumption</h1>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type="date"
                className="border-none focus:ring-0 text-sm bg-transparent dark:text-white"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Start Date"
              />
            </div>
            <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type="date"
                className="border-none focus:ring-0 text-sm bg-transparent dark:text-white"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="End Date"
              />
            </div>
          </div>

          <button
            onClick={handleDownload}
            disabled={isDownloading || !consumptionData}
            className={`flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors min-w-[140px] ${isDownloading || !consumptionData ? 'opacity-50 cursor-not-allowed' : ''
              }`}
          >
            {isDownloading ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Download className="h-5 w-5 mr-2" />
            )}
            {isDownloading ? 'Downloading...' : 'Download CSV'}
          </button>

          <button
            onClick={fetchConsumption}
            disabled={isLoading}
            className={`flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors min-w-[140px] ${isLoading ? 'opacity-75 cursor-not-allowed' : ''
              }`}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5 mr-2" />
            )}
            {isLoading ? 'Loading...' : 'Generate Report'}
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
      ) : consumptionData ? (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-xl font-semibold dark:text-white">Weekly Summary</h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">({periodLabel})</span>
                </div>
              </div>
              {/* Summary cards – now includes inward totals from the API */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-6 border border-indigo-100 dark:border-indigo-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-indigo-600 dark:text-indigo-300">Total Qty Consumed</p>
                      <p className="mt-2 text-3xl font-bold text-indigo-900 dark:text-indigo-100">
                        {safeNumber(consumptionData.total_consumption_quantity).toLocaleString()}
                      </p>
                      <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">units</p>
                    </div>
                    <Package className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-100 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Consumption Cost</p>
                      <p className="mt-2 text-3xl font-bold text-green-900 dark:text-green-300">
                        ₹{safeNumber(consumptionData.total_consumption_amount).toLocaleString()}
                      </p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-6 border border-amber-100 dark:border-amber-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Total Qty Inward</p>
                      <p className="mt-2 text-3xl font-bold text-amber-900 dark:text-amber-200">
                        {safeNumber(consumptionData.total_inward_quantity).toLocaleString()}
                      </p>
                      <p className="text-xs text-amber-500 dark:text-amber-400 mt-1">units</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6 border border-purple-100 dark:border-purple-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Inward Amount</p>
                      <p className="mt-2 text-3xl font-bold text-purple-900 dark:text-purple-200">
                        ₹{safeNumber(consumptionData.total_inward_amount).toLocaleString()}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>
              <div className="overflow-hidden">
                <h3 className="text-lg font-medium mb-4 dark:text-white">Material Consumption Breakdown</h3>
                <div className="flex items-center mb-4">
                  <input
                    type="text"
                    className="border rounded px-3 py-2 text-sm w-full max-w-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                    placeholder="Search by Material ID..."
                    title="Search by Material ID"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                {renderStockSummary(consumptionData.stock_summary, search, sort, setSort)}
              </div>
            </div>
          </div>
        </div>
      ) : !isLoading && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <FileText className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No Consumption Data Available</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Select a date range and click "Generate Report" to view consumption data
          </p>
        </div>
      )}
      <ScrollToTopButton />
    </div>
  );
};

export default WeeklyConsumption;