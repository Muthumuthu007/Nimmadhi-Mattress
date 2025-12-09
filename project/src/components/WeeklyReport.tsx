import React, { useState } from 'react';
import { format } from 'date-fns';
import XLSX from 'xlsx';

const WeeklyReport: React.FC = () => {
  const [transactions, setTransactions] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      
      // Prepare data for Excel
      const data = transactions.map(t => ({
        'Date': format(new Date(t.date), 'dd/MM/yyyy'),
        'Time': format(new Date(t.date), 'hh:mm a'),
        'Transaction Type': t.type,
        'Username': t.details?.username || t.details?.user || t.details?.user_name || t.username || t.user || t.user_name || 'N/A',
        'Product': t.details?.product || 'N/A',
        'Quantity': t.details?.quantity || 0,
        'Unit': t.details?.unit || 'N/A',
        'Cost': t.details?.cost || 0,
        'Total Cost': t.details?.totalCost || 0,
        'Notes': t.details?.notes || 'N/A'
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Set column widths
      const colWidths = [
        { wch: 12 }, // Date
        { wch: 10 }, // Time
        { wch: 15 }, // Transaction Type
        { wch: 20 }, // Username
        { wch: 25 }, // Product
        { wch: 10 }, // Quantity
        { wch: 8 },  // Unit
        { wch: 12 }, // Cost
        { wch: 12 }, // Total Cost
        { wch: 30 }  // Notes
      ];
      ws['!cols'] = colWidths;

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Weekly Report');

      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      
      // Create blob with proper MIME type
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `weekly-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      
      // Append to body, click, and cleanup
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setIsDownloading(false);
    } catch (error) {
      console.error('Error downloading report:', error);
      setIsDownloading(false);
    }
  };

  return (
    <div>
      {/* Render your component content here */}
    </div>
  );
};

export default WeeklyReport; 