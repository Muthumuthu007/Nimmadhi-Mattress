import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Download, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

interface StockAlertsProps {
  alerts: any[];
}

export const StockAlerts: React.FC<StockAlertsProps> = ({ alerts }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'materialName' | 'available' | 'shortage'>('materialName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  if (alerts.length === 0) return null;

  const handleDownload = () => {
    setIsDownloading(true);
    try {
      // Prepare data for Excel (use filtered and sorted alerts)
      const data = filteredAlerts.map(alert => ({
        'Material Name': alert.materialName,
        'Available Quantity': alert.available,
        'Minimum Stock Limit': alert.minStockLimit,
        'Status': 'Low Stock',
        'Shortage': alert.minStockLimit - alert.available,
        'Urgency Level': alert.minStockLimit - alert.available > alert.minStockLimit * 0.5 ? 'Critical' : 'Warning'
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(data);

      // Set column widths
      const colWidths = [
        { wch: 30 }, // Material Name
        { wch: 15 }, // Available Quantity
        { wch: 15 }, // Minimum Stock Limit
        { wch: 10 }, // Status
        { wch: 10 }, // Shortage
        { wch: 12 }  // Urgency Level
      ];
      ws['!cols'] = colWidths;

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Low Stock Alerts');

      // Generate filename with current date
      const fileName = `low-stock-alerts-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

      // Download file
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Error downloading alerts:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const getUrgencyLevel = (alert: any) => {
    const shortage = alert.minStockLimit - alert.available;
    const shortagePercentage = (shortage / alert.minStockLimit) * 100;

    if (shortagePercentage > 50) return 'Critical';
    if (shortagePercentage > 25) return 'High';
    return 'Warning';
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'High':
        return 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      default:
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
    }
  };

  // Filter and sort alerts
  const filteredAlerts = alerts
    .filter(a => a.materialName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortField === 'materialName') {
        aVal = a.materialName.toLowerCase();
        bVal = b.materialName.toLowerCase();
      } else if (sortField === 'available') {
        aVal = a.available;
        bVal = b.available;
      } else {
        aVal = a.minStockLimit - a.available;
        bVal = b.minStockLimit - b.available;
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="mb-6">
      <div className="bg-gradient-to-br from-white to-red-50 dark:from-gray-800 dark:to-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
        <div className="bg-gradient-to-r from-red-500 to-rose-600 dark:from-red-700 dark:to-rose-800 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Low Stock Alerts</h3>
                <p className="text-sm text-red-100">{filteredAlerts.length} items require attention</p>
              </div>
            </div>
            <div className="flex flex-1 gap-2 items-center justify-end">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search material..."
                className="w-full sm:w-48 px-3 py-1.5 rounded-xl border border-white/30 shadow-sm focus:ring-2 focus:ring-white/50 focus:border-white/50 outline-none transition text-sm bg-white/20 backdrop-blur-sm text-white placeholder-red-200"
                style={{ maxWidth: 200 }}
              />
              <select
                value={sortField + '-' + sortDir}
                onChange={e => {
                  const [field, dir] = e.target.value.split('-');
                  setSortField(field as any);
                  setSortDir(dir as any);
                }}
                className="px-2 py-1 rounded-xl border border-white/30 text-sm bg-white/20 backdrop-blur-sm text-white focus:ring-2 focus:ring-white/50 focus:border-white/50 outline-none [&>option]:text-gray-900 [&>option]:bg-white"
                style={{ minWidth: 120 }}
                title="Sort by"
              >
                <option value="materialName-asc">Name A-Z</option>
                <option value="materialName-desc">Name Z-A</option>
                <option value="available-asc">Available ↑</option>
                <option value="available-desc">Available ↓</option>
                <option value="shortage-asc">Shortage ↑</option>
                <option value="shortage-desc">Shortage ↓</option>
              </select>
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className={`p-2 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110
                  ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label="Download alerts"
                title="Download alerts as Excel"
              >
                <Download className="h-5 w-5" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110"
                aria-label={isExpanded ? "Collapse alerts" : "Expand alerts"}
              >
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Material Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Available
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Minimum Limit
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Shortage
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Action Required
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAlerts.map(alert => {
                  const urgencyLevel = getUrgencyLevel(alert);
                  const urgencyColor = getUrgencyColor(urgencyLevel);
                  const shortage = alert.minStockLimit - alert.available;
                  const shortagePercentage = ((shortage / alert.minStockLimit) * 100).toFixed(1);

                  return (
                    <tr key={alert.materialId} className="hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{alert.materialName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{alert.available} units</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{alert.minStockLimit} units</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-red-600 dark:text-red-400">
                          {shortage} units ({shortagePercentage}%)
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${urgencyColor}`}>
                          {urgencyLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          <span>Restock {shortage} units</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};