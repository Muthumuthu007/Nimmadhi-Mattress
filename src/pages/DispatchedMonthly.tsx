import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download, Calendar, Loader2, AlertCircle, RefreshCw,
  ArrowLeft, Package, Trash2
} from 'lucide-react';
import { makeApiRequest } from '../utils/api';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import DeleteConfirmationDialog from '../components/DeleteConfirmationDialog';
import * as XLSX from 'xlsx';
import { ReportSkeleton } from '../components/skeletons/ReportSkeleton';

const DispatchedMonthly = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fromDate, setFromDate] = useState<string>(format(new Date(), 'yyyy-MM-01'));
  const [toDate, setToDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'UNDONE'>('ALL');
  const [deleteTarget, setDeleteTarget] = useState<{ push_id: string, product_name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleFetchRecords = () => {
    setValidationError(null);
    if (!fromDate || !toDate) {
      setValidationError('Please select both From Date and To Date.');
      return;
    }
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (to < from) {
      setValidationError('To Date cannot be earlier than From Date.');
      return;
    }
    fetchRecords();
  };

  const fetchRecords = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { axiosInstance } = await import('../utils/axiosInstance');
      const response = await axiosInstance.post('/api/reports/production/monthly/', {
        from_date: fromDate,
        to_date: toDate
      });
      setSummary(Array.isArray(response?.data?.summary) ? response.data.summary : []);
      setRecords(Array.isArray(response?.data?.items) ? response.data.items : []);
    } catch (error: any) {
      setError(error?.response?.data?.error || error?.message || 'Failed to fetch dispatch records');
      setSummary([]);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!records.length) return;
    setIsDownloading(true);
    try {
      const header = [
        'Product Name', 'Quantity Produced', 'Cost per Unit', 'Total Production Cost', 'Status', 'Dispatched By', 'Timestamp'
      ];
      const rows = records.map(r => [
        r.product_name,
        r.quantity_produced,
        r.production_cost_per_unit,
        r.total_production_cost,
        r.status,
        r.username,
        r.timestamp
      ]);
      const summaryHeader = ['Product Name', 'Total Quantity Dispatched'];
      const summaryRows = summary.map(s => [s.product_name, s.total_quantity]);
      const ws = XLSX.utils.aoa_to_sheet([
        ['Summary'],
        summaryHeader,
        ...summaryRows,
        [],
        header,
        ...rows
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Monthly Dispatch');
      XLSX.writeFile(wb, `monthly-dispatch-${fromDate}_to_${toDate}.xlsx`);
    } catch (error) {
      setError('Failed to download Excel: ' + (error instanceof Error ? error.message : ''));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteMessage(null);
    try {
      const { axiosInstance } = await import('../utils/axiosInstance');
      const response = await axiosInstance.post('/api/production/delete-push/', {
        operation: 'DeletePushProduction',
        id: deleteTarget.push_id,
        username: user.username
      });
      if (response.data?.message?.includes('deleted successfully') || response.data?.message === 'Successfully deleted') {
        setDeleteMessage({ type: 'success', text: response.data.message });
        setRecords(prev => prev.filter(r => r.push_id !== deleteTarget.push_id));
      } else {
        setDeleteMessage({ type: 'error', text: response?.data?.message || 'Delete failed' });
      }
    } catch (e: any) {
      setDeleteMessage({ type: 'error', text: e?.response?.data?.message || e?.message || 'Delete failed' });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filteredRecords = records
    .filter(r =>
      (statusFilter === 'ALL' || (r.status || '').toUpperCase() === statusFilter) &&
      (
        (r.product_name && r.product_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.product_id && r.product_id.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    )
    .sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === 'timestamp') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard/dispatched')}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Monthly Dispatch Report</h1>
              <p className="text-teal-100 text-sm mt-1">View and manage monthly production dispatches</p>
            </div>
          </div>
          <Package className="h-8 w-8 text-white/80" />
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Date Range
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  if (toDate && e.target.value > toDate) setToDate(e.target.value);
                }}
                title="From date"
                aria-label="From date"
                max={toDate}
              />
              <span className="text-gray-500 font-semibold">to</span>
              <input
                type="date"
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                title="To date"
                aria-label="To date"
                min={fromDate}
              />
            </div>
          </div>
          <div>
            <label htmlFor="status-filter" className="block text-sm font-semibold text-gray-700 mb-2">Status Filter</label>
            <select
              id="status-filter"
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'UNDONE')}
            >
              <option value="ALL">All Records</option>
              <option value="ACTIVE">Active Only</option>
              <option value="UNDONE">Undone Only</option>
            </select>
          </div>
        </div>

        {/* Search and Sort Row */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 mt-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
              placeholder="Search by product name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Search products"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="sort-field" className="text-sm font-semibold text-gray-700">Sort by:</label>
            <select
              id="sort-field"
              className="px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
              value={sortField}
              onChange={e => setSortField(e.target.value)}
            >
              <option value="product_name">Product Name</option>
              <option value="quantity_produced">Quantity Produced</option>
              <option value="production_cost_per_unit">Cost per Unit</option>
              <option value="total_production_cost">Total Cost</option>
              <option value="status">Status</option>
              <option value="timestamp">Date</option>
            </select>
            <button
              type="button"
              className="px-3 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-bold"
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>
          <div className="flex-1"></div>
          <button
            onClick={handleDownload}
            disabled={isDownloading || !filteredRecords.length}
            className={`flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md font-semibold ${isDownloading || !filteredRecords.length ? 'opacity-50 cursor-not-allowed' : ''
              }`}
          >
            {isDownloading ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Download className="h-5 w-5 mr-2" />
            )}
            {isDownloading ? 'Downloading...' : 'Download Excel'}
          </button>
          <button
            onClick={handleFetchRecords}
            disabled={isLoading}
            className={`flex items-center justify-center px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all shadow-md font-semibold ${isLoading ? 'opacity-75 cursor-not-allowed' : ''
              }`}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5 mr-2" />
            )}
            {isLoading ? 'Loading...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="ml-3 text-sm font-medium text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {summary.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white">Dispatch Summary</h2>
            <p className="text-teal-100 text-sm mt-1">Total dispatched per product</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summary.map((s) => (
                <div key={s.product_id} className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg border-2 border-teal-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wider text-teal-700 font-semibold mb-1">Product</p>
                      <p className="text-base font-bold text-gray-900">{s.product_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wider text-teal-700 font-semibold mb-1">Quantity</p>
                      <p className="text-2xl font-bold text-teal-600">{s.total_quantity}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <ReportSkeleton />
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No dispatch records found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try a different date range or refresh the page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredRecords.map((record) => (
            <div
              key={record.push_id}
              className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-lg font-bold text-gray-900">{record.product_name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    ID: {record.product_id} <br />
                    Push ID: {record.push_id}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${record.status === 'Active' || record.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{record.status}</span>
                  <button className="text-red-500 hover:text-red-700 p-1.5 rounded-full" title="Delete Dispatch" onClick={() => setDeleteTarget({ push_id: record.push_id, product_name: record.product_name })}>
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4 mb-4">
                <div>
                  <div className="font-semibold mb-2 text-gray-700">Production Details</div>
                  <div className="text-sm text-gray-700">Quantity Produced: <span className="font-medium">{record.quantity_produced} units</span></div>
                  <div className="text-sm text-gray-700">Cost per Unit: <span className="font-medium">₹{record.production_cost_per_unit}</span></div>
                  <div className="text-sm text-gray-700">Total Cost: <span className="font-medium">₹{record.total_production_cost}</span></div>
                </div>
                <div>
                  <div className="font-semibold mb-2 text-gray-700">Material Deductions</div>
                  {record.stock_deductions && Object.keys(record.stock_deductions).length > 0 ? (
                    <ul className="text-sm text-gray-700">
                      {Object.entries(record.stock_deductions).map(([material, qty]) => (
                        <li key={material} className="flex justify-between">
                          <span>{material}</span>
                          <span className="font-medium">{qty as any} units</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-gray-500">No material deductions recorded.</div>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                <div className="flex items-center"><svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19a6 6 0 01-12 0V5a2 2 0 012-2h8a2 2 0 012 2v14z" /></svg>{record.timestamp ? format(new Date(record.timestamp), 'PPP, p') : ''}</div>
                <div className="flex items-center"><svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>{record.username}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <DeleteConfirmationDialog
        isOpen={!!deleteTarget}
        title="Delete Dispatch Record"
        message={`Are you sure you want to delete the dispatch record for '${deleteTarget?.product_name}'? This action cannot be undone.`}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      {deleteMessage && (
        <div className={`fixed top-0 left-1/2 transform -translate-x-1/2 mt-4 z-50 px-6 py-3 rounded-md shadow-lg border flex items-center gap-2 ${deleteMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}
          style={{ minWidth: '320px', maxWidth: '90vw' }}>
          <span>{deleteMessage.text}</span>
          <button className="ml-2 text-gray-400 hover:text-gray-600" onClick={() => setDeleteMessage(null)} title="Close">✕</button>
        </div>
      )}
      {validationError && (
        <div className="fixed top-0 left-1/2 transform -translate-x-1/2 mt-4 z-50 px-6 py-3 rounded-md shadow-lg border flex items-center gap-2 bg-red-50 border-red-200 text-red-700" style={{ minWidth: '320px', maxWidth: '90vw' }}>
          <span>{validationError}</span>
          <button className="ml-2 text-gray-400 hover:text-gray-600" onClick={() => setValidationError(null)} title="Close">✕</button>
        </div>
      )}
    </div>
  );
};

export default DispatchedMonthly;