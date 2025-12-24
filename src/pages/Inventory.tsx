import React, { useState, useEffect } from 'react';
import GroupTree from '../components/GroupTree';
import { axiosInstance } from '../utils/axiosInstance';
import { Plus, ArrowUpDown, Save, Download } from 'lucide-react';
import { NewProductForm } from '../components/NewProductForm';
import { useInventory } from '../hooks/useInventory';
import { fetchAllStocks, saveOpeningStock } from '../utils/inventoryApi';
import { useAuth } from '../contexts/AuthContext';
import { markOpeningStockSaved, markClosingStockSaved } from '../utils/dailyStockStorage';

import * as XLSX from 'xlsx';
import { format } from 'date-fns';

const Inventory = () => {
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showOpeningStockSummary, setShowOpeningStockSummary] = useState(false);
  const [openingStockSummary, setOpeningStockSummary] = useState<any>(null);
  const [isSavingOpeningStock, setIsSavingOpeningStock] = useState(false);
  const [showClosingStockSummary, setShowClosingStockSummary] = useState(false);
  const [closingStockSummary, setClosingStockSummary] = useState<any>(null);
  const { user } = useAuth();
  const { refreshInventory, inventory } = useInventory();

  useEffect(() => {
    console.log("Inventory data:", inventory);
  }, [inventory]);



  const handleClosingStock = async () => {
    setIsLoading(true);
    setClosingStockSummary(null);
    try {
      const payload = {
        username: user.username
      };
      const response = await axiosInstance.post('/api/stock/closing-stock/', payload);
      const res = response.data;

      if (res && res.message) {
        setClosingStockSummary({
          message: res.message,
          date: res.date,
          timestamp: res.timestamp,
          aggregate_closing_qty: res.aggregate_closing_qty,
          aggregate_closing_amount: res.aggregate_closing_amount
        });
        setShowClosingStockSummary(true);
        // Mark closing stock as saved in localStorage
        markClosingStockSaved();
      }
    } catch (error: any) {
      setClosingStockSummary({
        message: error?.message || 'Failed to save closing stock.'
      });
      setShowClosingStockSummary(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveOpeningStock = async () => {
    setIsSavingOpeningStock(true);
    setOpeningStockSummary(null);
    try {
      // Use the new saveOpeningStock function which hits /api/stock/opening-stock/
      const response = await saveOpeningStock(user.username || 'admin');

      console.log('Save Opening Stock Response:', response);

      if (response && response.message) {
        setOpeningStockSummary({
          message: response.message,
          report_date: response.report_date,
          timestamp: response.timestamp,
          aggregate_opening_qty: response.aggregate_opening_qty,
          aggregate_opening_amount: response.aggregate_opening_amount
        });
        setShowOpeningStockSummary(true);
        // Mark opening stock as saved in localStorage
        markOpeningStockSaved();
      }
    } catch (error: any) {
      console.error('Error in handleSaveOpeningStock:', error);
      const errorMessage = error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Failed to save opening stock.';
      setOpeningStockSummary({
        message: errorMessage
      });
      setShowOpeningStockSummary(true);
    } finally {
      setIsSavingOpeningStock(false);
    }
  };

  // --- DOWNLOAD EXCEL LOGIC ---
  const handleDownloadAllInventory = async () => {
    try {
      // Fetch the full group tree (same as GroupTree)
      const data: any[] = await fetchAllStocks(user.username);
      // GroupNode type: { group_id, group_name, items, subgroups }
      const excelColumns = [
        { key: 'subgroup', label: 'Subgroup' },
        { key: 'name', label: 'Material' },
        { key: 'quantity', label: 'Available' },
        { key: 'defective', label: 'Defective' },
        { key: 'total_quantity', label: 'Total Qty' },
        { key: 'unit', label: 'UNIT' },
        { key: 'cost_per_unit', label: 'Cost Per Unit' },
        { key: 'total_cost', label: 'Total Cost' },
        { key: 'stock_limit', label: 'Stock Limit' },
      ];
      // Recursively collect all materials from all groups and subgroups
      const collectAllMaterials = (currentGroup: any, parentName: string = ''): any[] => {
        let materials: any[] = [];
        if (currentGroup.items && currentGroup.items.length > 0) {
          materials = materials.concat(
            currentGroup.items.map((item: any) => ({
              ...item,
              subgroup: parentName || 'Main Group',
            }))
          );
        }
        if (currentGroup.subgroups && currentGroup.subgroups.length > 0) {
          currentGroup.subgroups.forEach((subgroup: any) => {
            materials = materials.concat(
              collectAllMaterials(subgroup, subgroup.group_name)
            );
          });
        }
        return materials;
      };
      // Collect all materials from all main groups
      let allMaterials: any[] = [];
      for (const group of data) {
        allMaterials = allMaterials.concat(collectAllMaterials(group, group.group_name));
      }
      // Group materials by subgroup
      const groupedMaterials: { [key: string]: any[] } = allMaterials.reduce((acc: { [key: string]: any[] }, material: any) => {
        const subgroup = material.subgroup;
        if (!acc[subgroup]) acc[subgroup] = [];
        acc[subgroup].push(material);
        return acc;
      }, {} as { [key: string]: any[] });
      // Sort subgroups alphabetically, but keep Main Group first
      const sortedSubgroups = Object.keys(groupedMaterials).sort((a, b) => {
        if (a === 'Main Group') return -1;
        if (b === 'Main Group') return 1;
        return a.localeCompare(b);
      });
      // Prepare data for Excel with hierarchy
      const dataRows: any[] = [];
      dataRows.push(excelColumns.map(col => col.label)); // Header row
      sortedSubgroups.forEach((subgroup: string) => {
        const materials = groupedMaterials[subgroup];
        // Add subgroup header
        dataRows.push([subgroup, ...Array(excelColumns.length - 1).fill('')]);
        // Add materials for this subgroup
        materials.forEach((item: any) => {
          const row: { [key: string]: any } = {};
          excelColumns.forEach(col => {
            if (col.key === 'total_cost') {
              row[col.label] = (Number(item.quantity) * Number(item.cost_per_unit)).toFixed(2);
            } else {
              row[col.label] = item[col.key];
            }
          });
          dataRows.push(Object.values(row));
        });
        // Add subtotal row for this subgroup
        const subtotal = {
          quantity: materials.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0),
          defective: materials.reduce((sum: number, item: any) => sum + (item.defective || 0), 0),
          total_cost: materials.reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.cost_per_unit || 0)), 0),
        };
        dataRows.push([
          `Subtotal for ${subgroup}`,
          '',
          subtotal.quantity,
          subtotal.defective,
          '', '', '',
          subtotal.total_cost.toFixed(2),
          ''
        ]);
        dataRows.push(Array(excelColumns.length).fill(''));
      });
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(dataRows);
      ws['!cols'] = excelColumns.map(col => ({ wch: Math.max(col.label.length + 5, 15) }));
      // Add styling for subgroup headers and subtotals
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let R = range.s.r; R <= range.e.r; R++) {
        const cell = ws[XLSX.utils.encode_cell({ r: R, c: 0 })];
        if (cell && cell.v && typeof cell.v === 'string' && cell.v.includes('Subtotal')) {
          cell.s = { font: { bold: true }, fill: { fgColor: { rgb: 'E2E8F0' } } };
        } else if (cell && cell.v && typeof cell.v === 'string' && (cell.v === 'Main Group' || !cell.v.includes('Subtotal'))) {
          cell.s = { font: { bold: true }, fill: { fgColor: { rgb: 'F0FDF4' } } };
        }
      }
      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
      // Download file
      XLSX.writeFile(wb, `full-inventory-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } catch (error) {
      // Optionally show a user-friendly error message
      console.error('Error downloading inventory:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER - Enhanced with gradient */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-800 dark:via-teal-800 dark:to-cyan-800 rounded-2xl shadow-xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Inventory Management</h1>
            <p className="text-emerald-100 dark:text-emerald-200 text-sm md:text-base">Manage your stock, materials, and inventory levels</p>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto">
            <button
              onClick={() => setShowNewProduct(true)}
              className="flex items-center gap-2 px-4 md:px-5 py-2.5 bg-white text-emerald-600 dark:text-emerald-700 rounded-xl font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base whitespace-nowrap"
              disabled={isLoading}
            >
              <Plus className="w-4 h-4" />
              Create Product
            </button>
            <button
              onClick={handleSaveOpeningStock}
              className="flex items-center gap-2 px-4 md:px-5 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-xl font-medium shadow-lg hover:bg-white/30 hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base whitespace-nowrap"
              disabled={isSavingOpeningStock}
              title="Save Opening Stock"
            >
              <Save className="w-4 h-4" />
              {isSavingOpeningStock ? 'Saving...' : 'Save Opening Stock'}
            </button>
            <button
              onClick={handleClosingStock}
              className="flex items-center gap-2 px-4 md:px-5 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-xl font-medium shadow-lg hover:bg-white/30 hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base whitespace-nowrap"
              disabled={isLoading}
            >
              <ArrowUpDown className="w-4 h-4" />
              Closing Stock
            </button>
            <button
              onClick={handleDownloadAllInventory}
              className="flex items-center gap-2 px-4 md:px-5 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-xl font-medium shadow-lg hover:bg-white/30 hover:shadow-xl hover:scale-105 transition-all duration-200 text-sm md:text-base whitespace-nowrap"
              title="Download Inventory Excel"
            >
              <Download className="w-4 h-4" />
              Download Excel
            </button>
          </div>
        </div>
      </div>

      <GroupTree />
      <DefectiveReport />

      {showNewProduct && (
        <NewProductForm
          inventory={inventory}
          onClose={() => setShowNewProduct(false)}
          onAddProduct={async (_) => {
            try {
              setShowNewProduct(false);
              await refreshInventory();
            } catch (error: any) {
              console.error('Failed to refresh inventory:', error);
            }
          }}
        />
      )}

      {/* Opening Stock Summary Modal */}
      {showOpeningStockSummary && openingStockSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 relative border border-gray-200 dark:border-gray-700">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              onClick={() => setShowOpeningStockSummary(false)}
              title="Close"
            >
              ×
            </button>
            <h2 className="text-lg font-bold mb-4 text-green-700 dark:text-green-400 flex items-center">
              <Save className="w-5 h-5 mr-2 text-green-600 dark:text-green-500" />
              Saved Successfully
            </h2>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <div><span className="font-semibold text-gray-900 dark:text-white">✅ Message:</span> {openingStockSummary.message}</div>
              {openingStockSummary.report_date && (
                <div><span className="font-semibold text-gray-900 dark:text-white">🗓 Report Date:</span> {openingStockSummary.report_date}</div>
              )}
              {openingStockSummary.timestamp && (
                <div><span className="font-semibold text-gray-900 dark:text-white">⏱ Timestamp:</span> {openingStockSummary.timestamp}</div>
              )}
              {openingStockSummary.aggregate_opening_qty !== undefined && (
                <div><span className="font-semibold text-gray-900 dark:text-white">📊 Aggregate Opening Qty:</span> {openingStockSummary.aggregate_opening_qty}</div>
              )}
              {openingStockSummary.aggregate_opening_amount !== undefined && (
                <div><span className="font-semibold text-gray-900 dark:text-white">💰 Aggregate Opening Amount:</span> {openingStockSummary.aggregate_opening_amount}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Closing Stock Summary Modal */}
      {showClosingStockSummary && closingStockSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 relative border border-gray-200 dark:border-gray-700">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              onClick={() => setShowClosingStockSummary(false)}
              title="Close"
            >
              ×
            </button>
            <h2 className="text-lg font-bold mb-4 text-blue-700 dark:text-blue-400 flex items-center">
              <ArrowUpDown className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-500" />
              Closing Stock Saved
            </h2>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <div><span className="font-semibold text-gray-900 dark:text-white">✅ Message:</span> {closingStockSummary.message}</div>
              {closingStockSummary.date && (
                <div><span className="font-semibold text-gray-900 dark:text-white">🗓 Date:</span> {closingStockSummary.date}</div>
              )}
              {closingStockSummary.timestamp && (
                <div><span className="font-semibold text-gray-900 dark:text-white">⏱ Timestamp:</span> {closingStockSummary.timestamp}</div>
              )}
              {closingStockSummary.aggregate_closing_qty !== undefined && (
                <div><span className="font-semibold text-gray-900 dark:text-white">📊 Aggregate Closing Qty:</span> {closingStockSummary.aggregate_closing_qty}</div>
              )}
              {closingStockSummary.aggregate_closing_amount !== undefined && (
                <div><span className="font-semibold text-gray-900 dark:text-white">💰 Aggregate Closing Amount:</span> {closingStockSummary.aggregate_closing_amount}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DefectiveReport: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchDefectiveReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        username: user.username
      };
      const response = await axiosInstance.post('/api/stock/descriptions/list/', payload);
      const res = response.data;
      setData(Array.isArray(res) ? res : []);
      setExpanded(true);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch defective report.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!data.length) return;
    const worksheetData = data.map(row => ({
      'Stock': row.stock,
      'Username': row.username,
      'Created At': row.created_at,
      'Description': row.description,
    }));
    const ws = XLSX.utils.json_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Defective Report');
    XLSX.writeFile(wb, `defective-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="mb-6">
      <div className="bg-gradient-to-br from-white to-red-50 dark:from-gray-800 dark:to-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
        <div className="bg-gradient-to-r from-red-500 to-rose-600 dark:from-red-700 dark:to-rose-800 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                <span role="img" aria-label="defective" className="text-2xl">🛑</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Defective Report</h3>
                <p className="text-sm text-red-100">{data.length} {data.length === 1 ? 'record' : 'records'} found</p>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={fetchDefectiveReport}
                disabled={loading}
                className={`px-4 py-2 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl hover:scale-105 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label="Fetch Defective Report"
                title="Fetch Defective Report"
              >
                {loading ? 'Loading...' : 'Show Report'}
              </button>
              <button
                onClick={handleDownload}
                disabled={!data.length}
                className={`p-2.5 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110 ${!data.length ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label="Download Defective Report"
                title="Download as Excel"
              >
                <Download className="h-5 w-5" />
              </button>
              <button
                onClick={() => setExpanded(e => !e)}
                className="p-2.5 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110"
                aria-label={expanded ? "Collapse report" : "Expand report"}
              >
                <span className="text-xl font-bold">{expanded ? '−' : '+'}</span>
              </button>
            </div>
          </div>
        </div>
        {expanded && (
          <div className="overflow-hidden">
            {error && <div className="text-red-600 dark:text-red-400 p-6 bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800">{error}</div>}
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30">
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Username</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Created At</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Description</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{row.stock}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{row.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{row.created_at}</td>
                      <td className="px-6 py-4 whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">{row.description}</td>
                    </tr>
                  ))}
                  {data.length === 0 && !loading && !error && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                            <span className="text-3xl">📋</span>
                          </div>
                          <p className="text-gray-500 dark:text-gray-400 font-medium">No defective records found</p>
                          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Click "Show Report" to fetch data</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;