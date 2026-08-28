import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Download, Loader2, RefreshCw, ArrowLeft,
  AlertCircle, Package, FileText, BarChart3, ChevronDown,
  ChevronUp, Search, TrendingDown, TrendingUp, Tag
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { axiosInstance } from '../../utils/axiosInstance';
import { ReportSkeleton } from '../../components/skeletons/ReportSkeleton';
import { formatApiDate } from '../../utils/dateUtils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConsumptionItem {
  item_id: string;
  total_quantity_consumed: number;
  total_quantity_added: number;
  total_added_cost: number;
  suppliers?: string[];
}

type SubCategoryMap = { [subcategory: string]: ConsumptionItem[] };
type CategoryMap = { [category: string]: SubCategoryMap };

interface ReportPeriod {
  start_date: string;
  end_date: string;
}

interface MonthlyConsumptionData {
  month: string;
  report_date: string;
  report_period: ReportPeriod;
  stock_summary: CategoryMap;
  total_consumption_quantity: number;
  total_consumption_amount: number;
  total_inward_quantity: number;
  total_inward_amount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function safeArray<T>(val: unknown): T[] {
  return Array.isArray(val) ? val : [];
}

// ─── Category Accordion ───────────────────────────────────────────────────────

// ─── Category Block ───────────────────────────────────────────────────────────

interface CategoryBlockProps {
  category: string;
  subcats: SubCategoryMap;
  search: string;
}

const CategoryBlock: React.FC<CategoryBlockProps> = ({ category, subcats, search }) => {
  const [open, setOpen] = useState(true);

  let catTotal = 0;
  let catQty = 0;
  Object.values(subcats ?? {}).forEach(items =>
    safeArray<ConsumptionItem>(items).forEach(item => {
      catTotal += item.total_added_cost ?? 0;
      catQty += item.total_quantity_consumed ?? 0;
    })
  );

  return (
    <div className="bg-gray-50 dark:bg-gray-800/60">
      <button
        type="button"
        className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-100 dark:hover:bg-gray-700/30 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
          <span className="font-bold text-gray-800 dark:text-gray-200 uppercase text-sm tracking-wide">{category}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Qty: {catQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{fmt(catTotal)}</span>
          {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {Object.entries(subcats ?? {}).map(([subcategory, items]) => (
            <SubCategoryTable
              key={subcategory}
              subcategory={subcategory}
              items={safeArray<ConsumptionItem>(items)}
              search={search}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Sub-Category Table ───────────────────────────────────────────────────────

type SortField = 'item_id' | 'total_quantity_consumed' | 'total_quantity_added' | 'total_added_cost';
type SortDir = 'asc' | 'desc';

interface SubCategoryTableProps {
  subcategory: string;
  items: ConsumptionItem[];
  search: string;
}

const SubCategoryTable: React.FC<SubCategoryTableProps> = ({ subcategory, items, search }) => {
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'item_id', dir: 'asc' });

  const safeNum = (v: number | undefined | null) => typeof v === 'number' && !Number.isNaN(v) ? v : 0;

  const filtered = items
    .filter(item => !search || item.item_id.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = a[sort.field];
      const bv = b[sort.field];
      const cmp = typeof av === 'string'
        ? (av as string).toLowerCase().localeCompare((bv as string).toLowerCase())
        : (safeNum(av as number)) - (safeNum(bv as number));
      return sort.dir === 'asc' ? cmp : -cmp;
    });

  if (filtered.length === 0) return null;

  const toggleSort = (field: SortField) =>
    setSort(s => ({ field, dir: s.field === field && s.dir === 'asc' ? 'desc' : 'asc' }));

  const sortIcon = (field: SortField) =>
    sort.field === field ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';

  const totConsumed = filtered.reduce((s, i) => s + safeNum(i.total_quantity_consumed), 0);
  const totAdded = filtered.reduce((s, i) => s + safeNum(i.total_quantity_added), 0);
  const totCost = filtered.reduce((s, i) => s + safeNum(i.total_added_cost), 0);

  const isUnknown = subcategory === 'Unknown';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Sub-category header */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 ${isUnknown ? 'bg-gray-50 dark:bg-gray-700/40' : 'bg-indigo-50 dark:bg-indigo-900/20'}`}>
        <div className="flex items-center gap-2">
          <Tag className={`h-3.5 w-3.5 ${isUnknown ? 'text-gray-400' : 'text-indigo-500'}`} />
          <span className={`text-xs font-bold uppercase tracking-wider ${isUnknown ? 'text-gray-500 dark:text-gray-400' : 'text-indigo-700 dark:text-indigo-300'}`}>
            {isUnknown ? 'Uncategorised' : subcategory}
          </span>
        </div>
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <Th onClick={() => toggleSort('item_id')} label={`Material${sortIcon('item_id')}`} align="left" />
              <Th onClick={() => toggleSort('total_quantity_consumed')} label={`Qty Consumed${sortIcon('total_quantity_consumed')}`} />
              <Th onClick={() => toggleSort('total_quantity_added')} label={`Qty Added${sortIcon('total_quantity_added')}`} />
              <Th onClick={() => toggleSort('total_added_cost')} label={`Added Cost${sortIcon('total_added_cost')}`} />
              <Th label="Suppliers" align="left" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map((item, i) => (
              <tr key={i} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors">
                <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white whitespace-nowrap">{item.item_id}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
                  {safeNum(item.total_quantity_consumed).toLocaleString('en-IN', { maximumFractionDigits: 4 })} units
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
                  {safeNum(item.total_quantity_added).toLocaleString('en-IN', { maximumFractionDigits: 4 })} units
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums font-bold text-indigo-700 dark:text-indigo-300">
                  {fmt(safeNum(item.total_added_cost))}
                </td>
                <td className="px-4 py-2.5 text-left text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {item.suppliers && item.suppliers.length > 0 ? item.suppliers.join(', ') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 dark:bg-gray-700/60 font-semibold text-xs">
            <tr>
              <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 uppercase tracking-wider">Sub-total</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-gray-800 dark:text-gray-200">
                {totConsumed.toLocaleString('en-IN', { maximumFractionDigits: 4 })} units
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-gray-800 dark:text-gray-200">
                {totAdded.toLocaleString('en-IN', { maximumFractionDigits: 4 })} units
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-indigo-700 dark:text-indigo-400 font-bold">{fmt(totCost)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

// Small helper component for sortable column headers
const Th: React.FC<{ label: string; onClick?: () => void; align?: 'left' | 'right' }> = ({ label, onClick, align = 'right' }) => (
  <th
    className={`px-4 py-2.5 text-${align} text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap ${onClick ? 'cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400' : ''}`}
    onClick={onClick}
  >
    {label}
  </th>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const MonthlyConsumption = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState<string>(formatApiDate(new Date(), 'yyyy-MM'));
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MonthlyConsumptionData | null>(null);
  const [search, setSearch] = useState('');

  const fetchConsumption = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post('/api/reports/consumption/monthly/', {
        month: selectedMonth,
      });
      setData(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to fetch consumption data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!data) return;
    setIsDownloading(true);
    try {
      const period = data.report_period;
      const header = [
        'Category', 'Sub-Category', 'Material',
        'Qty Consumed', 'Qty Added', 'Added Cost (₹)', 'Suppliers',
      ];
      const rows: (string | number)[][] = [header];

      Object.entries(data.stock_summary ?? {}).forEach(([category, subcats]) => {
        Object.entries(subcats ?? {}).forEach(([subcategory, items]) => {
          safeArray<ConsumptionItem>(items).forEach(item => {
            rows.push([
              category, subcategory, item.item_id,
              item.total_quantity_consumed ?? 0,
              item.total_quantity_added ?? 0,
              item.total_added_cost ?? 0,
              (item.suppliers ?? []).join('; '),
            ]);
          });
        });
      });

      rows.push([]);
      rows.push(['', '', 'GRAND TOTAL',
        data.total_consumption_quantity,
        '',
        data.total_inward_amount,
      ]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 24 }, { wch: 26 }, { wch: 40 },
        { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 30 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Monthly Consumption');
      const periodStr = period ? `${period.start_date}-to-${period.end_date}` : selectedMonth;
      XLSX.writeFile(wb, `monthly-consumption-${periodStr}.xlsx`);
    } catch {
      setError('Failed to generate download');
    } finally {
      setIsDownloading(false);
    }
  };

  // Derive period label from API response
  const period = data?.report_period;
  const periodLabel = period
    ? `${formatApiDate(period.start_date + 'T00:00:00', 'MMM d')} – ${formatApiDate(period.end_date + 'T00:00:00', 'MMM d, yyyy')}`
    : selectedMonth;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl shadow-xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard/reports')}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Monthly Consumption</h1>
              <p className="text-indigo-100 text-sm mt-1">
                Full cost breakdown by category, sub-category and item
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto">
            {/* Month picker */}
            <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5">
              <Calendar className="h-4 w-4 text-white/70" />
              <input
                type="month"
                className="bg-transparent text-white text-sm focus:outline-none"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
              />
            </div>

            <button
              onClick={handleDownload}
              disabled={isDownloading || !data}
              className={`flex items-center px-4 py-2.5 bg-green-500 text-white rounded-xl font-semibold shadow hover:bg-green-600 transition-all ${isDownloading || !data ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Export Excel
            </button>

            <button
              onClick={fetchConsumption}
              disabled={isLoading}
              className={`flex items-center px-4 py-2.5 bg-white text-indigo-700 rounded-xl font-bold shadow hover:bg-indigo-50 transition-all ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin text-indigo-600" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {isLoading ? 'Loading…' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-xl px-4 py-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
        </div>
      )}

      {isLoading ? (
        <ReportSkeleton />
      ) : data ? (
        <div className="space-y-6">

          {/* Summary stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Card 1 – Total Quantity Consumed */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-6 border border-indigo-100 dark:border-indigo-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-600 dark:text-indigo-300">Total Qty Consumed</p>
                  <p className="mt-2 text-3xl font-bold text-indigo-900 dark:text-indigo-100">
                    {(data.total_consumption_quantity ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">units</p>
                </div>
                <Package className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>

            {/* Card 2 – Total Consumption Cost */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-100 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Consumption Cost</p>
                  <p className="mt-2 text-3xl font-bold text-green-900 dark:text-green-300">
                    {fmt(data.total_consumption_amount ?? 0)}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>

            {/* Card 3 – Total Qty Inward */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-6 border border-amber-100 dark:border-amber-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Total Qty Inward</p>
                  <p className="mt-2 text-3xl font-bold text-amber-900 dark:text-amber-200">
                    {(data.total_inward_quantity ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-amber-500 dark:text-amber-400 mt-1">units</p>
                </div>
                <TrendingUp className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
            </div>

            {/* Card 4 – Total Inward Amount */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6 border border-purple-100 dark:border-purple-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Inward Amount</p>
                  <p className="mt-2 text-3xl font-bold text-purple-900 dark:text-purple-200">
                    {fmt(data.total_inward_amount ?? 0)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Breakdown section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Consumption Breakdown
                </h2>
                <span className="text-sm text-gray-400 dark:text-gray-500">({periodLabel})</span>
              </div>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search material…"
                  className="pl-9 pr-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 w-64"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="p-4 space-y-3">
              {Object.entries(data.stock_summary ?? {}).map(([category, subcats]) => (
                <CategoryBlock key={category} category={category} subcats={subcats ?? {}} search={search} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="h-16 w-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-indigo-300 dark:text-indigo-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-white mb-1">No Data Yet</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Select a month and click <strong>Generate Report</strong> to view consumption data
          </p>
        </div>
      )}
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}> = ({ icon, bg, label, value, sub, highlight }) => (
  <div className={`${bg} rounded-xl border border-gray-200 dark:border-gray-700 p-5`}>
    <div className="flex items-start justify-between mb-3">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
      {icon}
    </div>
    <p className={`text-2xl font-bold ${highlight ? 'text-green-700 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
      {value}
    </p>
    {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
  </div>
);

export default MonthlyConsumption;