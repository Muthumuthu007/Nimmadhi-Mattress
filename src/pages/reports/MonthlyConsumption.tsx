import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Download, Loader2, RefreshCw, ArrowLeft,
  AlertCircle, Package, FileText, BarChart3, ChevronDown,
  ChevronUp, Search, TrendingDown, Receipt, Tag
} from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { axiosInstance } from '../../utils/axiosInstance';
import { ReportSkeleton } from '../../components/skeletons/ReportSkeleton';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConsumptionItem {
  item_id: string;
  quantity: number;
  cost_per_unit: number;
  gst_percentage: number;
  amount_without_tax: number;
  gst_amount: number;
  amount_with_tax: number;
}

type SubCategoryMap = { [subcategory: string]: ConsumptionItem[] };
type CategoryMap = { [category: string]: SubCategoryMap };
type DayMap = { [date: string]: CategoryMap };

interface MonthlyConsumptionData {
  month: string;
  start_date: string;
  end_date: string;
  consumption_summary: DayMap;
  total_consumption_quantity: number;
  total_consumption_amount_without_tax: number;
  total_gst_amount: number;
  total_consumption_amount_with_tax: number;
  _version?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const safeDate = (d: string) => { try { return format(new Date(d + 'T00:00:00'), 'MMMM d, yyyy'); } catch { return d; } };

function safeArray<T>(val: unknown): T[] {
  return Array.isArray(val) ? val : [];
}

// ─── Day Accordion ───────────────────────────────────────────────────────────

interface DayBlockProps {
  date: string;
  categories: CategoryMap;
  search: string;
}

const DayBlock: React.FC<DayBlockProps> = ({ date, categories, search }) => {
  const [open, setOpen] = useState(false);

  // check if this day has any data at all
  const catEntries = Object.entries(categories ?? {});
  if (catEntries.length === 0) return null;

  // compute day total (amount_with_tax)
  let dayTotal = 0;
  let dayQty = 0;
  catEntries.forEach(([, subcats]) =>
    Object.values(subcats).forEach(items =>
      safeArray<ConsumptionItem>(items).forEach(item => {
        dayTotal += item.amount_with_tax ?? 0;
        dayQty += item.quantity ?? 0;
      })
    )
  );

  // filter: if search is active drop days that have no matching items
  let hasMatch = !search;
  if (search) {
    catEntries.forEach(([, subcats]) =>
      Object.values(subcats).forEach(items =>
        safeArray<ConsumptionItem>(items).forEach(item => {
          if (item.item_id.toLowerCase().includes(search.toLowerCase())) hasMatch = true;
        })
      )
    );
  }
  if (!hasMatch) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
      {/* Day header */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
            <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-900 dark:text-white">{safeDate(date)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {catEntries.length} categor{catEntries.length !== 1 ? 'ies' : 'y'} · Qty: {dayQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-semibold tracking-wider">Day Total (incl. GST)</p>
            <p className="text-lg font-bold text-indigo-700 dark:text-indigo-400">{fmt(dayTotal)}</p>
          </div>
          {open ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
        </div>
      </button>

      {/* Day body */}
      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {catEntries.map(([category, subcats]) => (
            <CategoryBlock key={category} category={category} subcats={subcats} search={search} />
          ))}
        </div>
      )}
    </div>
  );
};

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
  Object.values(subcats).forEach(items =>
    safeArray<ConsumptionItem>(items).forEach(item => {
      catTotal += item.amount_with_tax ?? 0;
      catQty += item.quantity ?? 0;
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
          {Object.entries(subcats).map(([subcategory, items]) => (
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

type SortField = 'item_id' | 'quantity' | 'cost_per_unit' | 'amount_with_tax';
type SortDir = 'asc' | 'desc';

interface SubCategoryTableProps {
  subcategory: string;
  items: ConsumptionItem[];
  search: string;
}

const SubCategoryTable: React.FC<SubCategoryTableProps> = ({ subcategory, items, search }) => {
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'item_id', dir: 'asc' });

  const filtered = items
    .filter(item => !search || item.item_id.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = a[sort.field];
      const bv = b[sort.field];
      const cmp = typeof av === 'string'
        ? (av as string).toLowerCase().localeCompare((bv as string).toLowerCase())
        : (av as number) - (bv as number);
      return sort.dir === 'asc' ? cmp : -cmp;
    });

  if (filtered.length === 0) return null;

  const toggleSort = (field: SortField) =>
    setSort(s => ({ field, dir: s.field === field && s.dir === 'asc' ? 'desc' : 'asc' }));

  const sortIcon = (field: SortField) =>
    sort.field === field ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';

  const totQty = filtered.reduce((s, i) => s + i.quantity, 0);
  const totNoTax = filtered.reduce((s, i) => s + i.amount_without_tax, 0);
  const totGst = filtered.reduce((s, i) => s + i.gst_amount, 0);
  const totWithTax = filtered.reduce((s, i) => s + i.amount_with_tax, 0);

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
              <Th onClick={() => toggleSort('quantity')} label={`Qty${sortIcon('quantity')}`} />
              <Th onClick={() => toggleSort('cost_per_unit')} label={`Rate${sortIcon('cost_per_unit')}`} />
              <Th label="GST%" />
              <Th onClick={() => toggleSort('amount_with_tax')} label={`Amt (ex-tax)${sortIcon('amount_with_tax')}`} />
              <Th label="GST Amt" />
              <Th label="Total (incl.GST)" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map((item, i) => (
              <tr key={i} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors">
                <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white whitespace-nowrap">{item.item_id}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
                  {item.quantity.toLocaleString('en-IN', { maximumFractionDigits: 4 })}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-400">{fmt(item.cost_per_unit)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${item.gst_percentage > 0 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                    {item.gst_percentage}%
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">{fmt(item.amount_without_tax)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-orange-600 dark:text-orange-400">{fmt(item.gst_amount)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-bold text-indigo-700 dark:text-indigo-300">{fmt(item.amount_with_tax)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 dark:bg-gray-700/60 font-semibold text-xs">
            <tr>
              <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 uppercase tracking-wider">Sub-total</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-gray-800 dark:text-gray-200">
                {totQty.toLocaleString('en-IN', { maximumFractionDigits: 4 })}
              </td>
              <td />
              <td />
              <td className="px-4 py-2.5 text-right tabular-nums text-gray-800 dark:text-gray-200">{fmt(totNoTax)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-orange-600 dark:text-orange-400">{fmt(totGst)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-indigo-700 dark:text-indigo-400 font-bold">{fmt(totWithTax)}</td>
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
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
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
      const header = [
        'Date', 'Category', 'Sub-Category', 'Material',
        'Quantity', 'Rate (₹)', 'GST%', 'Amt (ex-tax ₹)', 'GST Amt (₹)', 'Total incl.GST (₹)',
      ];
      const rows: (string | number)[][] = [header];

      Object.entries(data.consumption_summary).forEach(([date, categories]) => {
        Object.entries(categories ?? {}).forEach(([category, subcats]) => {
          Object.entries(subcats ?? {}).forEach(([subcategory, items]) => {
            safeArray<ConsumptionItem>(items).forEach(item => {
              rows.push([
                date, category, subcategory, item.item_id,
                item.quantity, item.cost_per_unit, item.gst_percentage,
                item.amount_without_tax, item.gst_amount, item.amount_with_tax,
              ]);
            });
          });
        });
      });

      rows.push([]);
      rows.push(['', '', '', 'GRAND TOTAL',
        data.total_consumption_quantity, '', '',
        data.total_consumption_amount_without_tax,
        data.total_gst_amount,
        data.total_consumption_amount_with_tax,
      ]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 14 }, { wch: 24 }, { wch: 26 }, { wch: 40 },
        { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 16 }, { wch: 14 }, { wch: 20 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Monthly Consumption');
      XLSX.writeFile(wb, `monthly-consumption-${selectedMonth}.xlsx`);
    } catch {
      setError('Failed to generate download');
    } finally {
      setIsDownloading(false);
    }
  };

  // Count active days (with data)
  const activeDays = data
    ? Object.values(data.consumption_summary).filter(cats => Object.keys(cats).length > 0).length
    : 0;

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
            <StatCard
              icon={<Calendar className="h-6 w-6 text-indigo-500" />}
              bg="bg-indigo-50 dark:bg-indigo-900/20"
              label="Active Days"
              value={String(activeDays)}
              sub={`of ${Object.keys(data.consumption_summary).length} days in period`}
            />
            <StatCard
              icon={<Package className="h-6 w-6 text-violet-500" />}
              bg="bg-violet-50 dark:bg-violet-900/20"
              label="Total Quantity"
              value={data.total_consumption_quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              sub="units consumed"
            />
            <StatCard
              icon={<TrendingDown className="h-6 w-6 text-blue-500" />}
              bg="bg-blue-50 dark:bg-blue-900/20"
              label="Amount (excl. GST)"
              value={fmt(data.total_consumption_amount_without_tax)}
              sub={`GST: ${fmt(data.total_gst_amount)}`}
            />
            <StatCard
              icon={<Receipt className="h-6 w-6 text-green-500" />}
              bg="bg-green-50 dark:bg-green-900/20"
              label="Total (incl. GST)"
              value={fmt(data.total_consumption_amount_with_tax)}
              highlight
              sub="grand total"
            />
          </div>

          {/* Breakdown section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Daily Breakdown
                </h2>
                <span className="text-sm text-gray-400 dark:text-gray-500">
                  ({format(new Date(data.start_date + 'T00:00:00'), 'MMM d')} – {format(new Date(data.end_date + 'T00:00:00'), 'MMM d, yyyy')})
                </span>
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
              {Object.entries(data.consumption_summary).map(([date, categories]) => (
                <DayBlock key={date} date={date} categories={categories ?? {}} search={search} />
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