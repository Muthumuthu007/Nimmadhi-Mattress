import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Download, Calendar, Loader2, AlertCircle, RefreshCw,
  ArrowLeft, Package, Clock, User, ArrowDownRight, ArrowUpRight,
  AlertTriangle, Plus, Save, Box, Settings, ArrowUp, ArrowDown, ChevronDown, ChevronRight
} from 'lucide-react';
import { axiosInstance } from '../../utils/axiosInstance';
import { format, parse } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import * as XLSX from 'xlsx';
import { ReportSkeleton } from '../../components/skeletons/ReportSkeleton';

const WeeklyReport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);

  // --- SORTING STATE ---
  const [itemSort, setItemSort] = useState<{ field: string; dir: 'asc' | 'desc' }>({ field: 'description', dir: 'asc' });

  // --- SEARCH & SORT STATE FOR ACTIVITIES ---
  const [activitySearch, setActivitySearch] = useState('');
  const [activitySort, setActivitySort] = useState<{ field: string; dir: 'asc' | 'desc' }>({ field: 'timestamp', dir: 'desc' });

  // --- GROUP EXPAND/COLLAPSE STATE ---
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const fetchReport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.post('/api/reports/normal/weekly/', {
        start_date: startDate,
        end_date: endDate
      });

      if (!response.data || !response.data.items || response.data.items.length === 0) {
        throw new Error('No data found for the selected date range');
      }

      setReportData(response.data);
    } catch (error: any) {
      console.error('Error fetching report:', error);
      setError(error?.response?.data?.message || error?.message || 'Failed to fetch weekly report data');
    } finally {
      setIsLoading(false);
    }
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'CreateStock':
        return <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case 'SubtractStockQuantity':
        return <ArrowDownRight className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case 'AddStockQuantity':
        return <ArrowUpRight className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'AddDefectiveGoods':
        return <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />;
      case 'PushToProduction':
        return <Box className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
      case 'SaveOpeningStock':
        return <Save className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />;
      case 'SaveClosingStock':
        return <Save className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'CreateProduct':
        return <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case 'UpdateStock':
        return <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
      default:
        return <Package className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getOperationColor = (type: string): string => {
    switch (type) {
      case 'CreateStock':
        return 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800';
      case 'SubtractStockQuantity':
        return 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800';
      case 'AddStockQuantity':
        return 'bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800';
      case 'AddDefectiveGoods':
        return 'bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:border-orange-800';
      case 'PushToProduction':
        return 'bg-purple-50 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800';
      case 'SaveOpeningStock':
        return 'bg-indigo-50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800';
      case 'SaveClosingStock':
        return 'bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800';
      case 'CreateProduct':
        return 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800';
      case 'UpdateStock':
        return 'bg-gray-50 border-gray-100 dark:bg-gray-800 dark:border-gray-700';
      default:
        return 'bg-gray-50 border-gray-100 dark:bg-gray-800 dark:border-gray-700';
    }
  };

  function sortRows(rows: any[], field: string, dir: 'asc' | 'desc') {
    return [...rows].sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];
      if (!isNaN(Number(aVal)) && !isNaN(Number(bVal))) {
        aVal = Number(aVal);
        bVal = Number(bVal);
      } else {
        aVal = (aVal ?? '').toString().toLowerCase();
        bVal = (bVal ?? '').toString().toLowerCase();
      }
      if (aVal < bVal) return dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  function filterAndSortActivities(activities: any[]) {
    activities = Array.isArray(activities) ? activities : [];
    let filtered = activities;
    if (activitySearch.trim()) {
      const q = activitySearch.trim().toLowerCase();
      filtered = activities.filter(tx => {
        const op = (tx.operation_type || '').toLowerCase();
        const user = (tx.details?.username || '').toLowerCase();
        const details = JSON.stringify(tx.details || {}).toLowerCase();
        return op.includes(q) || user.includes(q) || details.includes(q);
      });
    }
    const { field, dir } = activitySort;
    filtered = [...filtered].sort((a, b) => {
      let aVal = a[field];
      let bVal = b[field];
      if (field === 'timestamp') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else {
        aVal = (aVal ?? '').toString().toLowerCase();
        bVal = (bVal ?? '').toString().toLowerCase();
      }
      if (aVal < bVal) return dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }

  const renderActivities = (activities: any[]) => (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-2">
        <input
          type="text"
          className="border rounded px-3 py-2 w-full md:w-72 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
          placeholder="Search by operation, user, or details..."
          value={activitySearch}
          onChange={e => setActivitySearch(e.target.value)}
        />
        <div className="flex gap-2 items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">Sort by:</span>
          <select
            className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={activitySort.field}
            onChange={e => setActivitySort(s => ({ ...s, field: e.target.value }))}
            title="Sort field"
          >
            <option value="timestamp">Time</option>
            <option value="operation_type">Operation</option>
            <option value="username">Username</option>
          </select>
          <button
            className="ml-1 px-2 py-1 border rounded text-xs bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
            onClick={() => setActivitySort(s => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }))}
            title="Toggle sort direction"
          >
            {activitySort.dir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          </button>
        </div>
      </div>
      <div className="grid gap-5">
        {filterAndSortActivities(activities).map((tx) => {
          const op = tx.operation_type || tx.operation || 'UnknownOperation';
          return (
            <div
              key={tx.transaction_id}
              className={`relative flex flex-col sm:flex-row items-stretch gap-4 p-6 rounded-2xl shadow-md hover:shadow-lg transition-all ${getOperationColor(op)}`}
            >
              <div className="flex-shrink-0 flex items-center justify-center">
                {getOperationIcon(op)}
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-indigo-800 dark:text-indigo-300 capitalize">{op}</span>
                    <span className="hidden sm:inline text-xs text-gray-400 dark:text-gray-500 font-mono">#{tx.transaction_id?.slice(0, 6) ?? ''}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{tx.timestamp ? format(new Date(tx.timestamp), 'HH:mm') : ''}</span>
                    <span className="flex items-center gap-1"><User className="h-4 w-4" />{tx.details?.username || 'N/A'}</span>
                  </div>
                </div>
                {Object.entries(tx.details).length === 0 ? (
                  <div className="italic text-gray-400 text-sm">No details</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 bg-white/70 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                    {Object.entries(tx.details).map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-gray-700 dark:text-gray-300 text-sm">
                        <span className="font-medium text-gray-600 dark:text-gray-400 capitalize whitespace-nowrap">{k.replace(/_/g, ' ')}:</span>
                        <span className="text-gray-900 dark:text-gray-200 break-all">{typeof v === 'number' ? v.toLocaleString() : String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end mt-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">ID: {tx.transaction_id}</span>
                </div>
              </div>
            </div>
          );
        })}
        {filterAndSortActivities(activities).length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">No activities found.</div>
        )}
      </div>
    </div>
  );

  const handleDownloadExcel = () => {
    if (!reportData) return;
    setIsDownloading(true);
    try {
      const items = (Array.isArray(reportData.items) ? reportData.items : []);
      const groupedRows: Record<string, any[]> = {};
      items.forEach((row: any) => {
        if (row.description?.startsWith("TOTAL:")) return;
        const groupName = row.group_name || 'Uncategorized';
        const normGroupName = groupName.trim().toUpperCase();
        if (!groupedRows[normGroupName]) groupedRows[normGroupName] = [];
        groupedRows[normGroupName].push(row);
      });
      items.forEach((row: any) => {
        if (row.description?.startsWith("TOTAL:")) {
          const match = row.description.match(/^TOTAL:\s*(.*)$/i);
          let groupName = match ? match[1].trim() : 'Uncategorized';
          const normGroupName = groupName.trim().toUpperCase();
          if (!groupedRows[normGroupName]) groupedRows[normGroupName] = [];
          row.__isTotalRow = true;
          groupedRows[normGroupName].push(row);
        }
      });
      const mainSheetData = [];
      mainSheetData.push([
        'SL. NO', 'DESCRIPTION', 'RATE', 'OPENING STOCK', 'OPENING STOCK AMOUNT', 'STOCK INWARD', 'INWARD AMOUNT', 'CONSUMPTION', 'CONSUMPTION AMOUNT', 'BALANCE STOCK', 'BALANCE AMOUNT'
      ]);
      let slNo = 1;
      Object.entries(groupedRows).forEach(([group, groupItems]) => {
        mainSheetData.push([`${group}`]);
        const normalItems = groupItems.filter((item: any) => !item.__isTotalRow);
        const totalRows = groupItems.filter((item: any) => item.__isTotalRow);
        normalItems.forEach((item: any) => {
          mainSheetData.push([
            slNo++,
            item.description,
            item.rate,
            item.opening_stock_qty,
            item.opening_stock_amount,
            item.inward_qty,
            item.inward_amount,
            item.consumption_qty,
            item.consumption_amount,
            item.balance_qty,
            item.balance_amount
          ]);
        });
        totalRows.forEach((totalRow: any) => {
          mainSheetData.push([
            'TOTAL',
            totalRow.description,
            typeof totalRow.rate === 'undefined' ? '' : totalRow.rate,
            typeof totalRow.opening_stock_qty === 'undefined' ? '' : totalRow.opening_stock_qty,
            typeof totalRow.opening_stock_amount === 'undefined' ? '' : totalRow.opening_stock_amount,
            typeof totalRow.inward_qty === 'undefined' ? '' : totalRow.inward_qty,
            typeof totalRow.inward_amount === 'undefined' ? '' : totalRow.inward_amount,
            typeof totalRow.consumption_qty === 'undefined' ? '' : totalRow.consumption_qty,
            typeof totalRow.consumption_amount === 'undefined' ? '' : totalRow.consumption_amount,
            typeof totalRow.balance_qty === 'undefined' ? '' : totalRow.balance_qty,
            typeof totalRow.balance_amount === 'undefined' ? '' : totalRow.balance_amount
          ]);
        });
      });
      mainSheetData.push([]);
      mainSheetData.push([
        'SL. NO', 'DESCRIPTION', 'OPENING STOCK', 'OPENING STOCK AMOUNT', 'STOCK INWARD', 'INWARD AMOUNT', 'CONSUMPTION', 'CONSUMPTION AMOUNT', 'BALANCE STOCK', 'BALANCE AMOUNT'
      ]);
      (Array.isArray(reportData.group_summary) ? reportData.group_summary : []).forEach((row: any, idx: number) => {
        mainSheetData.push([
          idx + 1,
          row.description,
          row.opening_stock_qty,
          row.opening_stock_amount,
          row.inward_qty,
          row.inward_amount,
          row.consumption_qty,
          row.consumption_amount,
          row.balance_qty,
          row.balance_amount
        ]);
      });
      const ws = XLSX.utils.aoa_to_sheet(mainSheetData);
      ws['!cols'] = [
        { wch: 8 }, { wch: 22 }, { wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 22 }, { wch: 16 }, { wch: 22 }, { wch: 14 }, { wch: 18 }
      ];
      XLSX.writeFile(
        { SheetNames: ['Report'], Sheets: { Report: ws } },
        `weekly-report-${startDate}_to_${endDate}.xlsx`,
        { cellStyles: true }
      );
    } catch (error) {
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadActivitiesExcel = () => {
    if (!reportData || !reportData.transactions) return;
    setIsDownloading(true);
    try {
      const allActivities: any[] = [];
      Object.entries(reportData.transactions).forEach(([date, txBlock]: [string, any]) => {
        (Array.isArray(txBlock.operations) ? txBlock.operations : []).forEach((tx: any) => {
          allActivities.push({ date, ...tx });
        });
      });
      const detailKeys = new Set<string>();
      allActivities.forEach(tx => {
        if (tx.details && typeof tx.details === 'object') {
          Object.keys(tx.details).forEach(k => detailKeys.add(k));
        }
      });
      const columns = [
        'Date', 'Operation', 'Transaction ID', 'Username', 'Timestamp', ...Array.from(detailKeys)
      ];
      const sheetData = [columns];
      allActivities.forEach(tx => {
        const row = [
          tx.date,
          tx.operation_type || tx.operation || '',
          tx.transaction_id || '',
          tx.details?.username || '',
          tx.timestamp ? format(new Date(tx.timestamp), 'yyyy-MM-dd HH:mm:ss') : '',
          ...Array.from(detailKeys).map(k => tx.details?.[k] ?? '')
        ];
        sheetData.push(row);
      });
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws['!cols'] = columns.map(() => ({ wch: 18 }));
      XLSX.writeFile(
        { SheetNames: ['Daily Activities'], Sheets: { 'Daily Activities': ws } },
        `weekly-activities-${startDate}_to_${endDate}.xlsx`,
        { cellStyles: true }
      );
    } catch (error) {
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard/reports')}
            className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Reports
          </button>
          <h1 className="text-2xl font-bold dark:text-white">Weekly Report</h1>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm w-full sm:w-auto border border-gray-200 dark:border-gray-700">
              <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type="date"
                className="border-none focus:ring-0 text-sm w-full bg-transparent dark:text-white"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Start Date"
                title="Start Date"
                aria-label="Start Date"
              />
            </div>
            <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm w-full sm:w-auto border border-gray-200 dark:border-gray-700">
              <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type="date"
                className="border-none focus:ring-0 text-sm w-full bg-transparent dark:text-white"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="End Date"
                title="End Date"
                aria-label="End Date"
              />
            </div>
          </div>

          <button
            onClick={fetchReport}
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

          <button
            onClick={handleDownloadExcel}
            disabled={isDownloading || !reportData}
            className={`flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors min-w-[140px] ${isDownloading || !reportData ? 'opacity-50 cursor-not-allowed' : ''
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
            onClick={handleDownloadActivitiesExcel}
            disabled={isDownloading || !reportData}
            className={`flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-w-[180px] ${isDownloading || !reportData ? 'opacity-50 cursor-not-allowed' : ''
              }`}
          >
            {isDownloading ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Download className="h-5 w-5 mr-2" />
            )}
            {isDownloading ? 'Downloading...' : 'Download Daily Activities'}
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
      ) : reportData ? (
        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-semibold mb-2 dark:text-white">Items</h2>
            {(() => {
              const items = (reportData.items || []);
              const groupedRows: Record<string, any[]> = {};
              items.forEach((row: any) => {
                if (row.description?.startsWith("TOTAL:")) return;
                const groupName = row.group_name || 'Uncategorized';
                const normGroupName = groupName.trim().toUpperCase();
                if (!groupedRows[normGroupName]) groupedRows[normGroupName] = [];
                groupedRows[normGroupName].push(row.hasOwnProperty('rate') && typeof row.rate !== 'undefined' ? { ...row, rate: `₹${row.rate}` } : row);
              });
              items.forEach((row: any) => {
                if (row.description?.startsWith("TOTAL:")) {
                  const match = row.description.match(/^TOTAL:\s*(.*)$/i);
                  let groupName = match ? match[1].trim() : 'Uncategorized';
                  const normGroupName = groupName.trim().toUpperCase();
                  if (!groupedRows[normGroupName]) groupedRows[normGroupName] = [];
                  row.__isTotalRow = true;
                  groupedRows[normGroupName].push(row);
                }
              });
              return (
                <div className="overflow-x-auto rounded-xl shadow-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <table className="min-w-full">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">SL NO</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">Description</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">Rate</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">Opening Stock</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">Opening Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">Stock Inward</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">Inward Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">Consumption</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">Consumption Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">Balance Stock</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">Balance Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(groupedRows).map(([groupName, groupItems]) => {
                        const normalItems = groupItems.filter(item => !item.__isTotalRow);
                        const totalRows = groupItems.filter(item => item.__isTotalRow);
                        const sortedItems = sortRows(normalItems, itemSort.field, itemSort.dir);
                        const isExpanded = !!expandedGroups[groupName];
                        return (
                          <React.Fragment key={groupName}>
                            <tr className="bg-yellow-200 dark:bg-yellow-900/30">
                              <td colSpan={11} className="px-4 py-2 text-sm font-bold text-yellow-900 dark:text-yellow-100 border-t border-b border-gray-300 dark:border-gray-600 cursor-pointer select-none" onClick={() => toggleGroup(groupName)}>
                                <span className="flex items-center gap-2">
                                  {isExpanded ? <ChevronDown className="inline h-4 w-4" /> : <ChevronRight className="inline h-4 w-4" />}
                                  {groupName}
                                </span>
                              </td>
                            </tr>
                            {isExpanded && sortedItems.map((row, idx) => (
                              <tr key={idx} className="hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors duration-150">
                                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 border-t border-r border-gray-300 dark:border-gray-700">{idx + 1}</td>
                                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 border-t border-r border-gray-300 dark:border-gray-700">{row.description}</td>
                                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 border-t border-r border-gray-300 dark:border-gray-700">{row.rate}</td>
                                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 border-t border-r border-gray-300 dark:border-gray-700">{row.opening_stock_qty}</td>
                                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 border-t border-r border-gray-300 dark:border-gray-700">{row.opening_stock_amount}</td>
                                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 border-t border-r border-gray-300 dark:border-gray-700">{row.inward_qty}</td>
                                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 border-t border-r border-gray-300 dark:border-gray-700">{row.inward_amount}</td>
                                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 border-t border-r border-gray-300 dark:border-gray-700">{row.consumption_qty}</td>
                                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 border-t border-r border-gray-300 dark:border-gray-700">{row.consumption_amount}</td>
                                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 border-t border-r border-gray-300 dark:border-gray-700">{row.balance_qty}</td>
                                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 border-t border-r border-gray-300 dark:border-gray-700">{row.balance_amount}</td>
                              </tr>
                            ))}
                            {isExpanded && totalRows.map((totalRow, tIdx) => (
                              <tr key={`total-${tIdx}`} className="bg-gray-200 dark:bg-gray-700 font-bold">
                                <td className="px-4 py-2 text-sm border-t border-r border-gray-400 dark:border-gray-600 dark:text-white">TOTAL</td>
                                <td className="px-4 py-2 text-sm border-t border-r border-gray-400 dark:border-gray-600 dark:text-white">{totalRow.description}</td>
                                <td className="px-4 py-2 text-sm border-t border-r border-gray-400 dark:border-gray-600 dark:text-white">{typeof totalRow.rate === 'undefined' ? '' : totalRow.rate}</td>
                                <td className="px-4 py-2 text-sm border-t border-r border-gray-400 dark:border-gray-600 dark:text-white">{typeof totalRow.opening_stock_qty === 'undefined' ? '' : totalRow.opening_stock_qty}</td>
                                <td className="px-4 py-2 text-sm border-t border-r border-gray-400 dark:border-gray-600 dark:text-white">{typeof totalRow.opening_stock_amount === 'undefined' ? '' : totalRow.opening_stock_amount}</td>
                                <td className="px-4 py-2 text-sm border-t border-r border-gray-400 dark:border-gray-600 dark:text-white">{typeof totalRow.inward_qty === 'undefined' ? '' : totalRow.inward_qty}</td>
                                <td className="px-4 py-2 text-sm border-t border-r border-gray-400 dark:border-gray-600 dark:text-white">{typeof totalRow.inward_amount === 'undefined' ? '' : totalRow.inward_amount}</td>
                                <td className="px-4 py-2 text-sm border-t border-r border-gray-400 dark:border-gray-600 dark:text-white">{typeof totalRow.consumption_qty === 'undefined' ? '' : totalRow.consumption_qty}</td>
                                <td className="px-4 py-2 text-sm border-t border-r border-gray-400 dark:border-gray-600 dark:text-white">{typeof totalRow.consumption_amount === 'undefined' ? '' : totalRow.consumption_amount}</td>
                                <td className="px-4 py-2 text-sm border-t border-r border-gray-400 dark:border-gray-600 dark:text-white">{typeof totalRow.balance_qty === 'undefined' ? '' : totalRow.balance_qty}</td>
                                <td className="px-4 py-2 text-sm border-t border-r border-gray-400 dark:border-gray-600 dark:text-white">{typeof totalRow.balance_amount === 'undefined' ? '' : totalRow.balance_amount}</td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2 dark:text-white">Group Summary</h2>
            <div className="overflow-x-auto rounded-xl shadow-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
              <table className="min-w-full">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">SL NO</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">Opening Stock</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">Opening Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">Stock Inward</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">Inward Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">Consumption</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">Consumption Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">Balance Stock</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600">Balance Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(reportData.group_summary || []).map((row: any, idx: number) => (
                    <tr key={idx} className={row.description === 'TOTAL' ? 'bg-gray-200 dark:bg-gray-700 font-bold' : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors duration-150'}>
                      <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 border-t border-r border-gray-300 dark:border-gray-700">{idx + 1}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 border-t border-r border-gray-300 dark:border-gray-700">{row.description}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 border-t border-r border-gray-300 dark:border-gray-700">{row.opening_stock_qty}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 border-t border-r border-gray-300 dark:border-gray-700">{row.opening_stock_amount}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 border-t border-r border-gray-300 dark:border-gray-700">{row.inward_qty}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 border-t border-r border-gray-300 dark:border-gray-700">{row.inward_amount}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 border-t border-r border-gray-300 dark:border-gray-700">{row.consumption_qty}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 border-t border-r border-gray-300 dark:border-gray-700">{row.consumption_amount}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 border-t border-r border-gray-300 dark:border-gray-700">{row.balance_qty}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 border-t border-r border-gray-300 dark:border-gray-700">{row.balance_amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold dark:text-white">Daily Activities</h2>
              <button
                onClick={handleDownloadActivitiesExcel}
                disabled={isDownloading || !reportData}
                className={`flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-w-[180px] ${isDownloading || !reportData ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
              >
                {isDownloading ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Download className="h-5 w-5 mr-2" />
                )}
                {isDownloading ? 'Downloading...' : 'Download Daily Activities'}
              </button>
            </div>
            {Object.entries(reportData.transactions).map(([date, txBlock]) => (
              <div key={date} className="mb-6">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{date}</div>
                {renderActivities((txBlock as { operations: any[] }).operations)}
              </div>
            ))}
          </div>
        </div>
      ) : !isLoading && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <FileText className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No Weekly Report Data Available</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Select a date range and click "Generate Report" to view the data
          </p>
        </div>
      )}
    </div>
  );
};

export default WeeklyReport;