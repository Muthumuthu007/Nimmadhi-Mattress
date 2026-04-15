import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download, Calendar, Loader2, AlertCircle, RefreshCw,
  ArrowLeft, Package, ChevronDown, ChevronUp, Layers
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import * as XLSX from 'xlsx';

interface Product {
  product_id: string;
  product_name: string;
  total_quantity: number;
}

interface SubCategory {
  sub_category: string | null;
  sub_category_total: number;
  products: Product[];
}

interface GroupedCategory {
  category: string;
  category_total: number;
  sub_categories: SubCategory[];
}

interface WeeklyGroupedResponse {
  from_date: string;
  to_date: string;
  grouped_summary: GroupedCategory[];
  total_items: number;
  total_quantity: number;
}

const DispatchedWeeklyGrouped = () => {
  const navigate = useNavigate();
  const [fromDate, setFromDate] = useState<string>(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WeeklyGroupedResponse | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const expandAll = () => {
    if (!data) return;
    setExpandedCategories(new Set(data.grouped_summary.map(c => c.category)));
  };
  const collapseAll = () => setExpandedCategories(new Set());

  const fetchRecords = async () => {
    if (!fromDate || !toDate) { setError('Please select both dates.'); return; }
    if (new Date(toDate) < new Date(fromDate)) { setError('End date cannot be before start date.'); return; }
    setIsLoading(true);
    setError(null);
    try {
      const { axiosInstance } = await import('../utils/axiosInstance');
      const response = await axiosInstance.post('/api/reports/dispatch/weekly/grouped/', {
        from_date: fromDate,
        to_date: toDate,
      });
      setData(response.data);
      setExpandedCategories(new Set());
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to fetch grouped dispatch records');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!data?.grouped_summary?.length) return;
    setIsDownloading(true);
    try {
      const rows: any[] = [
        [`Weekly Grouped Dispatch — ${data.from_date} to ${data.to_date}`],
        [`Total Items: ${data.total_items}`, `Total Quantity: ${data.total_quantity}`],
        [],
        ['Category', 'Sub-Category', 'Product', 'Quantity'],
      ];
      data.grouped_summary.forEach((cat) => {
        (cat.sub_categories ?? []).forEach((sub) => {
          (sub.products ?? []).forEach((p, idx) => {
            rows.push([
              idx === 0 ? cat.category : '',
              sub.sub_category ?? '—',
              p.product_name.trim(),
              p.total_quantity,
            ]);
          });
          rows.push(['', `Sub-total: ${sub.sub_category ?? 'All'}`, '', sub.sub_category_total]);
        });
        rows.push([`Category Total: ${cat.category}`, '', '', cat.category_total]);
        rows.push([]);
      });
      rows.push(['GRAND TOTAL', '', '', data.total_quantity]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 26 }, { wch: 18 }, { wch: 45 }, { wch: 10 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Weekly Grouped Dispatch');
      XLSX.writeFile(wb, `dispatch-weekly-grouped-${fromDate}-to-${toDate}.xlsx`);
    } catch (err) {
      setError('Export failed: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setIsDownloading(false);
    }
  };

  const matchesSearch = (cat: GroupedCategory): boolean => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (cat.category.toLowerCase().includes(q)) return true;
    return (cat.sub_categories ?? []).some(sub =>
      (sub.sub_category ?? '').toLowerCase().includes(q) ||
      (sub.products ?? []).some(p => p.product_name.toLowerCase().includes(q))
    );
  };

  const filteredSummary = (data?.grouped_summary ?? []).filter(matchesSearch);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-fuchsia-600 to-pink-600 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/dashboard/dispatched')} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Weekly Grouped Dispatch</h1>
              <p className="text-fuchsia-100 text-sm mt-1">Category &rarr; Sub-category &rarr; Product breakdown</p>
            </div>
          </div>
          <Layers className="h-8 w-8 text-white/80" />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />Date Range
            </label>
            <div className="flex items-center gap-2">
              <input type="date" className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 transition-all"
                value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <span className="text-gray-500 font-semibold">to</span>
              <input type="date" className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 transition-all"
                value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
            <input type="text" className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-fuchsia-500 transition-all"
              placeholder="Search category, sub-category or product..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
          <button onClick={handleDownload} disabled={isDownloading || !data?.grouped_summary?.length}
            className={`flex items-center px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-sm transition-all ${isDownloading || !data?.grouped_summary?.length ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {isDownloading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Download className="h-5 w-5 mr-2" />}Export Excel
          </button>
          <button onClick={fetchRecords} disabled={isLoading}
            className={`flex items-center px-5 py-2.5 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700 font-semibold shadow-sm transition-all ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}>
            {isLoading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <RefreshCw className="h-5 w-5 mr-2" />}Fetch Records
          </button>
          {filteredSummary.length > 0 && (
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
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Categories</p>
            <p className="text-4xl font-bold text-gray-900">{data.grouped_summary?.length ?? 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Items</p>
            <p className="text-4xl font-bold text-fuchsia-600">{data.total_items}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Quantity</p>
            <p className="text-4xl font-bold text-gray-900">{data.total_quantity}</p>
          </div>
        </div>
      )}

      {/* Category Accordions */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-10 w-10 text-fuchsia-500 animate-spin" /></div>
      ) : !data ? (
        <div className="text-center py-12 bg-white rounded-xl shadow border border-gray-200">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Select a date range and fetch records</h3>
        </div>
      ) : filteredSummary.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow border border-gray-200">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No records found</h3>
          <p className="mt-1 text-sm text-gray-500">Try a different date range or search term.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSummary.map((cat) => {
            const isExpanded = expandedCategories.has(cat.category);
            const hasNamedSubs = (cat.sub_categories ?? []).some(s => s.sub_category !== null);
            return (
              <div key={cat.category} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <button type="button"
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-fuchsia-50/40 transition-colors"
                  onClick={() => toggleCategory(cat.category)}>
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-fuchsia-100 flex items-center justify-center shrink-0">
                      <Package className="h-5 w-5 text-fuchsia-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-bold text-gray-900">{cat.category}</p>
                      <p className="text-sm text-gray-500">
                        {(cat.sub_categories ?? []).length} sub-categor{(cat.sub_categories ?? []).length !== 1 ? 'ies' : 'y'}
                        {hasNamedSubs && <span className="ml-2 px-1.5 py-0.5 bg-fuchsia-100 text-fuchsia-700 text-xs rounded font-semibold">Multiple Sub-cats</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Category Total</p>
                      <p className="text-2xl font-bold text-fuchsia-700">{cat.category_total}</p>
                    </div>
                    {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {(cat.sub_categories ?? []).map((sub, subIdx) => (
                      <div key={subIdx} className={subIdx > 0 ? 'border-t border-gray-100' : ''}>
                        {sub.sub_category !== null && (
                          <div className="flex items-center justify-between px-6 py-2.5 bg-gray-50 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-fuchsia-400"></div>
                              <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">{sub.sub_category}</span>
                            </div>
                            <span className="text-sm font-semibold text-fuchsia-600 bg-fuchsia-50 px-3 py-0.5 rounded-full">
                              Sub-total: {sub.sub_category_total}
                            </span>
                          </div>
                        )}
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
                              {(sub.products ?? []).map((p) => (
                                <tr key={p.product_id} className="hover:bg-fuchsia-50/20 transition-colors">
                                  <td className="py-2.5 text-sm text-gray-800">{p.product_name.trim()}</td>
                                  <td className="py-2.5 text-sm font-bold text-right text-fuchsia-600">{p.total_quantity}</td>
                                  <td className="py-2.5 text-sm text-right text-gray-400">
                                    {cat.category_total > 0 ? ((p.total_quantity / cat.category_total) * 100).toFixed(1) + '%' : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                    <div className="px-6 py-3 bg-fuchsia-50 border-t border-fuchsia-100 flex justify-between items-center">
                      <span className="text-sm font-semibold text-fuchsia-700">Category Total</span>
                      <span className="text-lg font-bold text-fuchsia-800">{cat.category_total}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DispatchedWeeklyGrouped;
