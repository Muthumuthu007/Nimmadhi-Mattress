import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download, Calendar, Loader2, AlertCircle, RefreshCw,
  ArrowLeft, Package, ChevronDown, ChevronUp, Layers, Info
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import { formatApiDate } from '../utils/dateUtils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface GroupedDispatchProduct {
  product_name: string;
  total_quantity: number;
}

interface GroupedDispatchDetail {
  product_id: string;
  product_name: string;
  quantity_produced: number;
  timestamp: string;
  username: string;
}

interface MonthlyGroupedDispatchReport {
  month: string;
  from_date: string;
  to_date: string;
  grouped_dispatch: Record<string, GroupedDispatchProduct[]>;
  grouped_dispatch_detail: Record<string, GroupedDispatchDetail[]>;
  total_dispatch: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format an ISO timestamp -> "07 Aug 2026, 04:02 PM" */
function formatTimestamp(iso: string): string {
  try {
    return format(parseISO(iso), 'dd MMM yyyy, hh:mm aa');
  } catch {
    return iso;
  }
}

/** Format a yyyy-MM string -> "August 2026" */
function formatMonthLabel(month: string): string {
  try {
    return format(parseISO(month + '-01'), 'MMMM yyyy');
  } catch {
    return month;
  }
}

/** Calculate total quantity for a group */
function groupTotal(products: GroupedDispatchProduct[]): number {
  return products.reduce((sum, p) => sum + (p.total_quantity ?? 0), 0);
}

// ─── Component ───────────────────────────────────────────────────────────────

const DispatchedMonthlyGrouped = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState<string>(formatApiDate(new Date(), 'yyyy-MM'));
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MonthlyGroupedDispatchReport | null>(null);

  // expandedGroups: set of group names whose summary is expanded
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  // detailGroup: which group's detail panel is open (null = none)
  const [detailGroup, setDetailGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  };

  const toggleDetail = (group: string) => {
    setDetailGroup(prev => (prev === group ? null : group));
  };

  const getGroupEntries = (): [string, GroupedDispatchProduct[]][] => {
    if (!data?.grouped_dispatch) return [];
    return Object.entries(data.grouped_dispatch).filter(
      ([, products]) => Array.isArray(products) && products.length > 0
    );
  };

  const getFilteredEntries = (): [string, GroupedDispatchProduct[]][] => {
    const q = searchQuery.toLowerCase();
    if (!q) return getGroupEntries();
    return getGroupEntries().filter(
      ([groupName, products]) =>
        groupName.toLowerCase().includes(q) ||
        products.some(p => p.product_name.toLowerCase().includes(q))
    );
  };

  const expandAll = () => {
    setExpandedGroups(new Set(getGroupEntries().map(([g]) => g)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
    setDetailGroup(null);
  };

  const getMonthRange = (month: string) => {
    const date = new Date(month + '-01');
    return {
      from_date: format(startOfMonth(date), 'yyyy-MM-dd'),
      to_date: format(endOfMonth(date), 'yyyy-MM-dd'),
    };
  };

  const fetchRecords = async () => {
    if (!selectedMonth) { setError('Please select a month.'); return; }
    setIsLoading(true);
    setError(null);
    try {
      const { axiosInstance } = await import('../utils/axiosInstance');
      const { from_date, to_date } = getMonthRange(selectedMonth);
      const response = await axiosInstance.post('/api/reports/dispatch/monthly/grouped/', {
        from_date,
        to_date,
      });
      setData(response.data);
      setExpandedGroups(new Set());
      setDetailGroup(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to fetch grouped dispatch records');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!data) return;
    const allEntries = getGroupEntries();
    if (!allEntries.length) return;
    setIsDownloading(true);
    try {
      const rows: any[] = [
        [`Monthly Grouped Dispatch Report - ${formatMonthLabel(data.month ?? selectedMonth)}`],
        [`Period: ${data.from_date} to ${data.to_date}`],
        [`Total Dispatch: ${data.total_dispatch}`],
        [],
        ['Group', 'Product', 'Quantity'],
      ];

      allEntries.forEach(([groupName, products]) => {
        const total = groupTotal(products);
        products.forEach((p, idx) => {
          rows.push([idx === 0 ? groupName : '', p.product_name.trim(), p.total_quantity]);
        });
        rows.push([`Group Total: ${groupName}`, '', total]);
        rows.push([]);
      });

      rows.push(['TOTAL DISPATCH', '', data.total_dispatch]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 20 }, { wch: 52 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Monthly Grouped Dispatch');
      XLSX.writeFile(wb, `dispatch-monthly-grouped-${selectedMonth}.xlsx`);
    } catch (err) {
      setError('Export failed: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setIsDownloading(false);
    }
  };

  const entries = getFilteredEntries();
  const hasData = data && Object.keys(data.grouped_dispatch ?? {}).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-600 to-orange-500 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/dashboard/dispatched')} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Monthly Grouped Dispatch</h1>
              <p className="text-rose-100 text-sm mt-1">Group &rarr; Product breakdown</p>
            </div>
          </div>
          <Layers className="h-8 w-8 text-white/80" />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="md:w-60">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />Select Month
            </label>
            <input
              type="month"
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-rose-500 transition-all"
              placeholder="Search group name or product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={handleDownload}
            disabled={isDownloading || !hasData}
            className={`flex items-center px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-sm transition-all ${isDownloading || !hasData ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isDownloading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Download className="h-5 w-5 mr-2" />}
            Export Excel
          </button>
          <button
            onClick={fetchRecords}
            disabled={isLoading}
            className={`flex items-center px-5 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-semibold shadow-sm transition-all ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {isLoading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <RefreshCw className="h-5 w-5 mr-2" />}
            Fetch Records
          </button>
          {entries.length > 0 && (
            <>
              <button onClick={expandAll} className="flex items-center px-4 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold transition-all text-sm">
                <ChevronDown className="h-4 w-4 mr-1" />Expand All
              </button>
              <button onClick={collapseAll} className="flex items-center px-4 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold transition-all text-sm">
                <ChevronUp className="h-4 w-4 mr-1" />Collapse All
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {/* Summary Stats */}
      {!isLoading && data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Month</p>
            <p className="text-xl font-bold text-gray-900">{formatMonthLabel(data.month ?? selectedMonth)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Groups</p>
            <p className="text-4xl font-bold text-rose-600">{Object.keys(data.grouped_dispatch ?? {}).length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Dispatch</p>
            <p className="text-4xl font-bold text-gray-900">{data.total_dispatch}</p>
          </div>
        </div>
      )}

      {/* Group Accordions */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-10 w-10 text-rose-500 animate-spin" />
        </div>
      ) : !data ? (
        <div className="text-center py-12 bg-white rounded-xl shadow border border-gray-200">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Select a month and fetch records</h3>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow border border-gray-200">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No records found</h3>
          <p className="mt-1 text-sm text-gray-500">Try a different month or search term.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(([groupName, products]) => {
            const isExpanded = expandedGroups.has(groupName);
            const isDetailOpen = detailGroup === groupName;
            const total = groupTotal(products);
            const details: GroupedDispatchDetail[] = data?.grouped_dispatch_detail?.[groupName] ?? [];

            return (
              <div key={groupName} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Group Header */}
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-rose-50/40 transition-colors"
                  onClick={() => toggleGroup(groupName)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                      <Package className="h-5 w-5 text-rose-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-bold text-gray-900">{groupName}</p>
                      <p className="text-sm text-gray-500">
                        {products.length} product{products.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Group Total</p>
                      <p className="text-2xl font-bold text-rose-700">{total}</p>
                    </div>
                    {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                  </div>
                </button>

                {/* Expanded Summary: product list */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    <div className="px-6 py-3">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="pb-1.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Product</th>
                            <th className="pb-1.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Qty</th>
                            <th className="pb-1.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">% Share</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {products.map((p, idx) => (
                            <tr key={idx} className="hover:bg-rose-50/20 transition-colors">
                              <td className="py-2.5 text-sm text-gray-800">{p.product_name.trim()}</td>
                              <td className="py-2.5 text-sm font-bold text-right text-rose-600">{p.total_quantity}</td>
                              <td className="py-2.5 text-sm text-right text-gray-400">
                                {total > 0 ? ((p.total_quantity / total) * 100).toFixed(1) + '%' : '---'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Group footer total */}
                    <div className="px-6 py-3 bg-rose-50 border-t border-rose-100 flex justify-between items-center">
                      <span className="text-sm font-semibold text-rose-700">Group Total</span>
                      <span className="text-lg font-bold text-rose-800">{total}</span>
                    </div>

                    {/* Detail toggle - only if detail records exist */}
                    {details.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleDetail(groupName)}
                          className="w-full flex items-center justify-between px-6 py-3 bg-gray-50 hover:bg-gray-100 border-t border-gray-100 transition-colors text-sm font-semibold text-gray-600"
                        >
                          <span className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-rose-500" />
                            View Detailed Records ({details.length})
                          </span>
                          {isDetailOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                        </button>

                        {/* Detail table */}
                        {isDetailOpen && (
                          <div className="px-6 py-4 border-t border-gray-100 overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Product</th>
                                  <th className="pb-2 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Quantity</th>
                                  <th className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pl-4">Date / Time</th>
                                  <th className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pl-4">User</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {details.map((d, idx) => (
                                  <tr key={d.product_id ? `${d.product_id}-${idx}` : idx} className="hover:bg-rose-50/20 transition-colors">
                                    <td className="py-2.5 text-gray-800">{d.product_name}</td>
                                    <td className="py-2.5 font-bold text-right text-rose-600">{d.quantity_produced}</td>
                                    <td className="py-2.5 text-gray-500 pl-4">{formatTimestamp(d.timestamp)}</td>
                                    <td className="py-2.5 text-gray-500 pl-4">{d.username}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Overall Total Dispatch */}
          {data && (
            <div className="bg-gradient-to-r from-rose-700 to-orange-600 rounded-xl shadow-md p-5 flex items-center justify-between">
              <span className="text-white font-bold text-lg uppercase tracking-wide">Total Dispatch</span>
              <span className="text-white text-3xl font-extrabold">{data.total_dispatch}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DispatchedMonthlyGrouped;
