import { format } from 'date-fns';

export const downloadCSV = (data: string, filename: string) => {
  const blob = new Blob(['\ufeff' + data], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const generateDailyReportCSV = (reportData: any) => {
  if (!reportData) return '';

  let csv = 'DAILY REPORT\n';
  csv += `Report Date: ${format(new Date(reportData.report_date), 'MMMM d, yyyy')}\n\n`;

  // Stock Summary Section
  csv += '1. STOCK SUMMARY\n';
  csv += 'Metric,Quantity,Amount (₹)\n';
  csv += `Opening Stock,${reportData.stock_summary.opening_stock_qty},${reportData.stock_summary.opening_stock_amount}\n`;
  csv += `Consumption,${reportData.stock_summary.consumption_qty},${reportData.stock_summary.consumption_amount}\n`;
  csv += `Closing Stock,${reportData.stock_summary.closing_stock_qty},${reportData.stock_summary.closing_stock_amount}\n\n`;

  // Transaction Summary Section
  csv += '2. TRANSACTION SUMMARY BY OPERATION\n';
  Object.entries(reportData.transactions_by_operation || {}).forEach(([operation, transactions]: [string, any]) => {
    csv += `\n${operation} Transactions\n`;
    csv += 'Transaction ID,Item ID,Username,Timestamp,Details,Status\n';

    transactions.forEach((transaction: any) => {
      const details = transaction.details;
      csv += `${transaction.transaction_id},`;
      csv += `${details.item_id},`;
      csv += `${details.username},`;
      csv += `${format(new Date(transaction.timestamp), 'HH:mm:ss')},`;
      csv += `"${formatTransactionDetailsForCSV(transaction.details, transaction.operation_type)}",`;
      csv += `${transaction.operation_type}\n`;
    });
  });

  return csv;
};

export const generateWeeklyReportCSV = (reportData: any) => {
  if (!reportData) return '';

  let csv = 'WEEKLY REPORT\n';
  csv += `Report Period: ${format(new Date(reportData.report_period.start_date), 'MMMM d, yyyy')} to ${format(new Date(reportData.report_period.end_date), 'MMMM d, yyyy')}\n\n`;

  // Overall Summary Section
  csv += '1. OVERALL SUMMARY\n';
  csv += 'Metric,Quantity,Amount (₹)\n';
  csv += `Opening Stock,${reportData.overall_stock_summary.opening_stock_qty},${reportData.overall_stock_summary.opening_stock_amount}\n`;
  csv += `Total Consumption,${reportData.overall_stock_summary.consumption_qty},${reportData.overall_stock_summary.consumption_amount}\n`;
  csv += `Closing Stock,${reportData.overall_stock_summary.closing_stock_qty},${reportData.overall_stock_summary.closing_stock_amount}\n\n`;

  // Daily Summary Section
  csv += '2. DAILY SUMMARY\n';
  csv += 'Date,Opening Stock Qty,Opening Stock Amount (₹),Consumption Qty,Consumption Amount (₹),Closing Stock Qty,Closing Stock Amount (₹)\n';

  Object.entries(reportData.daily_report).sort().forEach(([date, data]: [string, any]) => {
    if (!data.stock_summary) return;
    
    const formattedDate = format(new Date(date), 'MMM dd, yyyy');
    csv += `${formattedDate},${data.stock_summary.opening_stock_qty},${data.stock_summary.opening_stock_amount},`;
    csv += `${data.stock_summary.consumption_qty},${data.stock_summary.consumption_amount},`;
    csv += `${data.stock_summary.closing_stock_qty},${data.stock_summary.closing_stock_amount}\n`;
  });
  csv += '\n';

  // Transactions Section
  csv += '3. TRANSACTIONS BY DAY\n';
  Object.entries(reportData.daily_report).sort().forEach(([date, data]: [string, any]) => {
    if (!data.transactions || data.transactions.length === 0) return;
    
    const formattedDate = format(new Date(date), 'MMM dd, yyyy');
    csv += `\n${formattedDate}\n`;
    csv += 'Transaction ID,Operation Type,Item ID,Username,Timestamp,Details\n';

    data.transactions.forEach((transaction: any) => {
      csv += `${transaction.transaction_id},`;
      csv += `${transaction.operation_type},`;
      csv += `${transaction.details.item_id},`;
      csv += `${transaction.details.username},`;
      csv += `${format(new Date(transaction.timestamp), 'HH:mm:ss')},`;
      csv += `"${formatTransactionDetailsForCSV(transaction.details, transaction.operation_type)}"\n`;
    });
  });

  return csv;
};

export const generateMonthlyReportCSV = (reportData: any) => {
  if (!reportData) return '';

  let csv = 'MONTHLY REPORT\n';
  csv += `Report Period: ${format(new Date(reportData.report_period.start_date), 'MMMM yyyy')}\n\n`;

  // Overall Summary Section
  csv += '1. OVERALL SUMMARY\n';
  csv += 'Metric,Quantity,Amount (₹)\n';
  csv += `Opening Stock,${reportData.overall_stock_summary.opening_stock_qty},${reportData.overall_stock_summary.opening_stock_amount}\n`;
  csv += `Total Consumption,${reportData.overall_stock_summary.consumption_qty},${reportData.overall_stock_summary.consumption_amount}\n`;
  csv += `Closing Stock,${reportData.overall_stock_summary.closing_stock_qty},${reportData.overall_stock_summary.closing_stock_amount}\n\n`;

  // Daily Summary Section
  csv += '2. DAILY SUMMARY\n';
  csv += 'Date,Opening Stock Qty,Opening Stock Amount (₹),Consumption Qty,Consumption Amount (₹),Closing Stock Qty,Closing Stock Amount (₹)\n';

  Object.entries(reportData.daily_report).sort().forEach(([date, data]: [string, any]) => {
    if (!data.stock_summary) return;
    
    const formattedDate = format(new Date(date), 'MMM dd, yyyy');
    csv += `${formattedDate},${data.stock_summary.opening_stock_qty},${data.stock_summary.opening_stock_amount},`;
    csv += `${data.stock_summary.consumption_qty},${data.stock_summary.consumption_amount},`;
    csv += `${data.stock_summary.closing_stock_qty},${data.stock_summary.closing_stock_amount}\n`;
  });
  csv += '\n';

  // Transactions Section
  csv += '3. TRANSACTIONS BY DAY\n';
  Object.entries(reportData.daily_report).sort().forEach(([date, data]: [string, any]) => {
    if (!data.transactions || data.transactions.length === 0) return;
    
    const formattedDate = format(new Date(date), 'MMM dd, yyyy');
    csv += `\n${formattedDate}\n`;
    csv += 'Transaction ID,Operation Type,Item ID,Username,Timestamp,Details\n';

    data.transactions.forEach((transaction: any) => {
      csv += `${transaction.transaction_id},`;
      csv += `${transaction.operation_type},`;
      csv += `${transaction.details.item_id},`;
      csv += `${transaction.details.username},`;
      csv += `${format(new Date(transaction.timestamp), 'HH:mm:ss')},`;
      csv += `"${formatTransactionDetailsForCSV(transaction.details, transaction.operation_type)}"\n`;
    });
  });

  return csv;
};

function formatTransactionDetailsForCSV(details: any, type: string): string {
  switch (type) {
    case 'SubtractStockQuantity':
      return `Subtracted ${details.quantity_subtracted} units (New total: ${details.new_total})`;
    case 'AddStockQuantity':
      return `Added ${details.quantity_added} units (New total: ${details.new_total})`;
    case 'AddDefectiveGoods':
      return `Added ${details.defective_added} defective units (New total: ${details.new_defective})`;
    case 'CreateStock':
      return `Created stock with ${details.quantity} units at ₹${details.cost_per_unit}/unit`;
    case 'PushToProduction':
      return `Produced ${details.quantity_produced} units at ₹${details.production_cost_per_unit}/unit (Total: ₹${details.total_production_cost})`;
    case 'SaveOpeningStock':
      return `Opening stock saved: ${details.opening_stock_qty} units (₹${details.opening_stock_amount})`;
    case 'SaveClosingStock':
      return `Closing stock saved: ${details.closing_stock_qty} units (₹${details.closing_stock_amount}), Consumption: ${details.consumption_qty} units (₹${details.consumption_amount})`;
    case 'CreateProduct':
      return `Created product "${details.product_name}" with production cost ₹${details.production_cost_total}`;
    case 'UpdateStock':
      return `Updated from ${details.old_quantity} to ${details.new_quantity} units (Cost: ₹${details.new_cost_per_unit}/unit)`;
    default:
      return JSON.stringify(details);
  }
}