import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download, Calendar, Loader2, AlertCircle, RefreshCw,
  ArrowLeft, FileText, Trash2
} from 'lucide-react';
import { getWeeklyGrnReport, deleteGrn } from '../utils/grnApi';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import { ReportSkeleton } from '../components/skeletons/ReportSkeleton';

const GrnWeekly = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Set default to last 7 days including today
  const [fromDate, setFromDate] = useState<string>(
    format(new Date(new Date().setDate(new Date().getDate() - 6)), 'yyyy-MM-dd')
  );
  const [toDate, setToDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [deletingGrnId, setDeletingGrnId] = useState<string | null>(null);

  const handleFetchRecords = () => {
    if (!fromDate || !toDate) {
      setError('Please select both Start Date and End Date.');
      return;
    }
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (to < from) {
      setError('End Date cannot be earlier than Start Date.');
      return;
    }
    fetchRecords();
  };

  const fetchRecords = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getWeeklyGrnReport(fromDate, toDate);
      setData(response);
      setRecords(Array.isArray(response?.data) ? response.data : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch weekly GRN records');
      setData(null);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = () => {
    if (!records.length) return;
    setIsDownloading(true);
    try {
      const exportData = records.map((record, index) => ({
        'Serial no': index + 1,
        'Date': record.date ? format(new Date(record.date), 'dd MMM yyyy') : '—',
        'Supplier Name': record.supplierName,
        'Material': record.rawMaterial,
        'Bill Number': record.billNumber,
        'Bill Date': record.billDate ? format(new Date(record.billDate), 'dd MMM yyyy') : '—',
        'Billed Qty': record.billedQuantity,
        'Received Qty': record.receivedQuantity,
        'Transport': record.transport,
        'Tally': record.tallyReference,
        'SGST': record.sgstAmount,
        'CGST': record.cgstAmount,
        'IGST': record.igstAmount,
        'Total': record.totalAmount,
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Weekly GRN');

      const colWidths = [
        { wch: 10 }, { wch: 12 }, { wch: 25 }, { wch: 20 }, { wch: 15 },
        { wch: 12 }, { wch: 12 }, { wch: 13 }, { wch: 15 }, { wch: 18 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
      ];
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `GRN_Weekly_${fromDate}_to_${toDate}.xlsx`);
    } catch (err) {
      setError('Failed to download Excel: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteGrn = async (grnId: string) => {
    if (!window.confirm(`Delete GRN ${grnId}? This cannot be undone.`)) return;
    setDeletingGrnId(grnId);
    try {
      await deleteGrn(grnId);
      setRecords(prev => prev.filter(grn => grn.grnId !== grnId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete GRN');
    } finally {
      setDeletingGrnId(null);
    }
  };

  const filteredRecords = records.filter(r =>
    (r.supplierName && r.supplierName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (r.rawMaterial && r.rawMaterial.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (r.billNumber && r.billNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard/grn')}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Weekly GRN Report</h1>
              <p className="text-emerald-100 text-sm mt-1">View incoming goods summary for the week</p>
            </div>
          </div>
          <FileText className="h-8 w-8 text-white/80" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Date Range
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="date"
                className="w-full sm:flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <span className="text-gray-500 font-semibold">to</span>
              <input
                type="date"
                className="w-full sm:flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-teal-500 transition-all"
              placeholder="Search by supplier, material, bill number..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={handleDownload}
            disabled={isDownloading || !filteredRecords.length}
            className={`flex items-center justify-center px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold shadow-sm ${isDownloading || !filteredRecords.length ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isDownloading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Download className="h-5 w-5 mr-2" />}
            Export
          </button>
          <button
            onClick={handleFetchRecords}
            disabled={isLoading}
            className={`flex items-center justify-center px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all font-semibold shadow-sm ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {isLoading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <RefreshCw className="h-5 w-5 mr-2" />}
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm flex">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="ml-3 text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {!isLoading && data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 flex flex-col justify-center items-center">
            <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-1">Total GRN Count</p>
            <p className="text-4xl font-bold text-gray-900">{data.total_count}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 flex flex-col justify-center items-center">
            <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-1">Total Amount</p>
            <p className="text-4xl font-bold text-teal-600">₹{(data.total_amount || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 flex flex-col justify-center items-center">
            <p className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-1">Total Quantity</p>
            <p className="text-4xl font-bold text-gray-900">{(data.total_quantity || 0).toLocaleString()}</p>
          </div>
        </div>
      )}

      {!isLoading && data?.supplier_summary && Object.keys(data.supplier_summary).length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-800">Supplier Summary</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(data.supplier_summary).map(([supplier, details]: any) => (
              <div key={supplier} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                <p className="font-bold text-gray-800 mb-2 truncate" title={supplier}>{supplier}</p>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Count:</span><span className="font-semibold">{details.count}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Quantity:</span><span className="font-semibold">{details.total_quantity}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Amount:</span><span className="font-semibold text-teal-700">₹{details.total_amount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <ReportSkeleton />
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow border border-gray-200">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No GRN records found</h3>
          <p className="mt-1 text-sm text-gray-500">Try a different date range or refresh.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Supplier Name</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Material</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Bill Number</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Transport</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Billed Qty</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rec. Qty</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Amount</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record) => (
                  <tr key={record.grnId} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700">
                      {record.date ? format(new Date(record.date), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm font-medium text-gray-900">{record.supplierName}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700">{record.rawMaterial}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700 font-mono">{record.billNumber}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700">{record.transport}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700">{record.billedQuantity}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700">{record.receivedQuantity}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-sm font-semibold text-teal-600">₹{(record.totalAmount || 0).toLocaleString()}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-center">
                      <button
                        onClick={() => handleDeleteGrn(record.grnId)}
                        disabled={deletingGrnId === record.grnId}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded-full"
                        title="Delete GRN"
                      >
                        {deletingGrnId === record.grnId ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Trash2 className="h-5 w-5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default GrnWeekly;
