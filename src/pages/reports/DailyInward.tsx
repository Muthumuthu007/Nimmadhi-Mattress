import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Download, Loader2, RefreshCw, ArrowLeft,
  AlertCircle, FileText, BarChart3, Package, TrendingUp, Users, Hash
} from 'lucide-react';
import { axiosInstance } from '../../utils/axiosInstance';
import * as XLSX from 'xlsx';
import { ReportSkeleton } from '../../components/skeletons/ReportSkeleton';
import { formatApiDate } from '../../utils/dateUtils';
import ScrollToTopButton from '../../components/ScrollToTopButton';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportPeriod {
  start_date: string;
  end_date: string;
}

interface SupplierSummary {
  supplier_name: string;
  grn_count: number;
  billed_quantity: number;
  received_quantity: number;
  total_amount: number;
}

interface GRNEntry {
  grnId: string;
  billNumber: string;
  supplierName: string;
  rawMaterial: string;
  date: string;
  billDate: string;
  created_at: string;
  transport: string;
  tallyReference: string;
  billedQuantity: number;
  receivedQuantity: number;
  totalAmount: number;
  taxPercentage: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  costing: number;
}

interface DailyInwardData {
  report_period: ReportPeriod;
  total_count: number;
  total_billed_quantity: number;
  total_received_quantity: number;
  total_amount: number;
  supplier_summary: SupplierSummary[];
  grns: GRNEntry[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `₹${(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtQty = (n: number) =>
  (n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });

// ─── Main Component ───────────────────────────────────────────────────────────

const DailyInward: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<string>(
    formatApiDate(new Date(), 'yyyy-MM-dd')
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DailyInwardData | null>(null);
  const [search, setSearch] = useState('');

  // ── API fetch ──────────────────────────────────────────────────────────────

  const fetchInward = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.post('/api/reports/inward/daily/', {
        report_date: selectedDate,
      });
      setData(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to fetch inward data');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Excel Download ─────────────────────────────────────────────────────────

  const handleDownload = () => {
    if (!data) return;
    setIsDownloading(true);
    try {
      // Sheet 1 – GRN Details
      const grnRows = data.grns.map(g => ({
        'GRN ID': g.grnId,
        'Bill Number': g.billNumber,
        'Supplier': g.supplierName,
        'Raw Material': g.rawMaterial,
        'GRN Date': g.date,
        'Bill Date': g.billDate,
        'Transport': g.transport,
        'Tally Ref': g.tallyReference,
        'Billed Qty': g.billedQuantity,
        'Received Qty': g.receivedQuantity,
        'Total Amount (₹)': g.totalAmount,
        'Tax %': g.taxPercentage,
        'CGST (₹)': g.cgstAmount,
        'SGST (₹)': g.sgstAmount,
        'IGST (₹)': g.igstAmount,
        'Costing (₹)': g.costing,
      }));

      // Sheet 2 – Supplier Summary
      const supplierRows = data.supplier_summary.map(s => ({
        'Supplier': s.supplier_name,
        'GRN Count': s.grn_count,
        'Billed Qty': s.billed_quantity,
        'Received Qty': s.received_quantity,
        'Total Amount (₹)': s.total_amount,
      }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(grnRows), 'GRN Details');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(supplierRows), 'Supplier Summary');
      XLSX.writeFile(wb, `daily-inward-grn-${selectedDate}.xlsx`);
    } catch {
      setError('Failed to generate download');
    } finally {
      setIsDownloading(false);
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────────

  const periodLabel = data?.report_period
    ? formatApiDate(data.report_period.start_date, 'MMMM d, yyyy')
    : selectedDate;

  const filteredGRNs = (data?.grns ?? []).filter(g =>
    !search ||
    g.supplierName.toLowerCase().includes(search.toLowerCase()) ||
    g.rawMaterial.toLowerCase().includes(search.toLowerCase()) ||
    g.billNumber.toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard/reports')}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Reports
          </button>
          <h1 className="text-2xl font-bold dark:text-white">Daily GRN Report</h1>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          {/* Date picker */}
          <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            <input
              type="date"
              className="border-none focus:ring-0 text-sm bg-transparent dark:text-white"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              title="Select report date"
            />
          </div>

          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={isDownloading || !data}
            className={`flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors min-w-[140px] ${isDownloading || !data ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isDownloading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Download className="h-5 w-5 mr-2" />}
            {isDownloading ? 'Downloading…' : 'Export Excel'}
          </button>

          {/* Generate */}
          <button
            onClick={fetchInward}
            disabled={isLoading}
            className={`flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors min-w-[140px] ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {isLoading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <RefreshCw className="h-5 w-5 mr-2" />}
            {isLoading ? 'Loading…' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-500 p-4 rounded-r-lg">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-500 shrink-0" />
            <p className="ml-3 text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {isLoading ? (
        <ReportSkeleton />
      ) : data ? (
        <div className="space-y-6">

          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Total GRNs */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-6 border border-indigo-100 dark:border-indigo-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-600 dark:text-indigo-300">Total GRNs</p>
                  <p className="mt-2 text-3xl font-bold text-indigo-900 dark:text-indigo-100">
                    {data.total_count}
                  </p>
                  <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">entries</p>
                </div>
                <Hash className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>

            {/* Billed Quantity */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-100 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-300">Billed Quantity</p>
                  <p className="mt-2 text-3xl font-bold text-blue-900 dark:text-blue-100">
                    {fmtQty(data.total_billed_quantity)}
                  </p>
                  <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">units</p>
                </div>
                <Package className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            {/* Received Quantity */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border border-green-100 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Received Quantity</p>
                  <p className="mt-2 text-3xl font-bold text-green-900 dark:text-green-300">
                    {fmtQty(data.total_received_quantity)}
                  </p>
                  <p className="text-xs text-green-500 dark:text-green-400 mt-1">units</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>

            {/* Total Amount */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6 border border-purple-100 dark:border-purple-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Amount</p>
                  <p className="mt-2 text-3xl font-bold text-purple-900 dark:text-purple-200">
                    {fmt(data.total_amount)}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* ── Supplier Summary ── */}
          {data.supplier_summary.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Supplier Summary</h2>
                <span className="text-sm text-gray-400 dark:text-gray-500">({periodLabel})</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Supplier</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">GRN Count</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Billed Qty</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Received Qty</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data.supplier_summary.map((s, i) => (
                      <tr key={i} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors">
                        <td className="px-6 py-3 font-semibold text-gray-900 dark:text-white">{s.supplier_name}</td>
                        <td className="px-6 py-3 text-right text-gray-700 dark:text-gray-300">{s.grn_count}</td>
                        <td className="px-6 py-3 text-right text-gray-700 dark:text-gray-300">{fmtQty(s.billed_quantity)}</td>
                        <td className="px-6 py-3 text-right text-gray-700 dark:text-gray-300">{fmtQty(s.received_quantity)}</td>
                        <td className="px-6 py-3 text-right font-bold text-indigo-700 dark:text-indigo-300">{fmt(s.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-700/60 font-semibold text-xs">
                    <tr>
                      <td className="px-6 py-3 text-gray-600 dark:text-gray-300 uppercase tracking-wider">Grand Total</td>
                      <td className="px-6 py-3 text-right text-gray-800 dark:text-gray-200">{data.total_count}</td>
                      <td className="px-6 py-3 text-right text-gray-800 dark:text-gray-200">{fmtQty(data.total_billed_quantity)}</td>
                      <td className="px-6 py-3 text-right text-gray-800 dark:text-gray-200">{fmtQty(data.total_received_quantity)}</td>
                      <td className="px-6 py-3 text-right text-indigo-700 dark:text-indigo-400 font-bold">{fmt(data.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ── GRN Details Table ── */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">GRN Details</h2>
                <span className="text-sm text-gray-400 dark:text-gray-500">
                  ({filteredGRNs.length} of {data.grns.length} entries)
                </span>
              </div>
              {/* Search */}
              <input
                type="text"
                placeholder="Search supplier, material, bill no…"
                className="border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 w-full sm:w-72 transition-all"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Bill No.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Supplier</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Raw Material</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">GRN Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Bill Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Billed Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Rcvd Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">CGST</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">SGST</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">IGST</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Costing</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Total Amt</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Transport</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Tally Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredGRNs.length > 0 ? filteredGRNs.map((g) => (
                    <tr key={g.grnId} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors">
                      <td className="px-4 py-3 font-semibold text-indigo-700 dark:text-indigo-300 whitespace-nowrap">{g.billNumber}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white whitespace-nowrap">{g.supplierName}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{g.rawMaterial}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatApiDate(g.date + 'T00:00:00', 'MMM d, yyyy')}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatApiDate(g.billDate + 'T00:00:00', 'MMM d, yyyy')}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{fmtQty(g.billedQuantity)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-green-700 dark:text-green-400 font-semibold">{fmtQty(g.receivedQuantity)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-400">{fmt(g.cgstAmount)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-400">{fmt(g.sgstAmount)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-400">{fmt(g.igstAmount)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-amber-700 dark:text-amber-400">{fmt(g.costing)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-indigo-700 dark:text-indigo-300 whitespace-nowrap">{fmt(g.totalAmount)}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{g.transport}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{g.tallyReference || '—'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={14} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500">
                        No GRN entries match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
                {filteredGRNs.length > 0 && (
                  <tfoot className="bg-gray-50 dark:bg-gray-700/60 font-semibold text-xs">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-gray-600 dark:text-gray-300 uppercase tracking-wider">Totals</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-800 dark:text-gray-200">
                        {fmtQty(filteredGRNs.reduce((s, g) => s + g.billedQuantity, 0))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-800 dark:text-gray-200">
                        {fmtQty(filteredGRNs.reduce((s, g) => s + g.receivedQuantity, 0))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                        {fmt(filteredGRNs.reduce((s, g) => s + g.cgstAmount, 0))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                        {fmt(filteredGRNs.reduce((s, g) => s + g.sgstAmount, 0))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                        {fmt(filteredGRNs.reduce((s, g) => s + g.igstAmount, 0))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-amber-700 dark:text-amber-400">
                        {fmt(filteredGRNs.reduce((s, g) => s + g.costing, 0))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-indigo-700 dark:text-indigo-400 font-bold">
                        {fmt(filteredGRNs.reduce((s, g) => s + g.totalAmount, 0))}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      ) : !isLoading && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <FileText className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No GRN Data Available</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Select a date and click "Generate Report" to view inward data
          </p>
        </div>
      )}

      <ScrollToTopButton />
    </div>
  );
};

export default DailyInward;