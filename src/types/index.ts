export interface RawMaterial {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  cost: number;
  available: number;
  minStockLimit?: number;
  defectiveQuantity: number;
  totalQuantity?: number;
  gst?: number;
  gst_amount?: number;
  total_cost?: number;
  updated_at?: string;
  created_at?: string;
  group_id?: string;
}

export interface ProductMaterial {
  materialName: string;
  quantity: number;
  groupChain: string[];
}

export interface ProductionCostBreakdown {
  [key: string]: number;
}

export interface Product {
  id: string;
  name: string;
  inventory: number;
  maxProduce: number;
  originalMaxProduce: number;
  productionCostTotal: number;
  productionCostBreakdown: ProductionCostBreakdown;
  stockNeeded: { [key: string]: number };
  createdAt: string;
  materials: ProductMaterial[];
  wastageAmount: number;
  wastagePercent: number;
  labourCost: number;
  transportCost?: number;
  transport_cost?: number;
  otherCost: number;
  totalCost: number;
  wastage?: number;
  laborCost?: number;
  groupChain?: { [key: string]: string };
}

export interface StockAlert {
  materialId: string;
  materialName: string;
  available: number;
  minStockLimit: number;
}

export interface ProductionSummary {
  productId: string;
  name: string;
  possibleUnits: number;
  limitingMaterials: string[];
}

export interface Report {
  id: string;
  title: string;
  type: 'daily' | 'weekly' | 'monthly';
  date: string;
  data: {
    totalProduction: number;
    totalDefective: number;
    materialUsage: Array<{
      materialId: string;
      materialName: string;
      quantity: number;
      defective: number;
    }>;
    revenue: number;
  };
}

export interface InsufficientMaterial {
  material_id: string;
  material_name: string;
  required_per_unit: number;
  available_stock: number;
  shortage: number;
}

export interface ProductionResponse {
  message: string;
  push_id?: string;
  product_id?: string;
  quantity_produced?: number;
  production_cost_per_unit?: number;
  total_production_cost?: number;
  total_cost?: number;
  can_produce?: boolean;
  max_produce?: number;
  reason?: string;
  insufficient_materials?: InsufficientMaterial[];
  status?: string;
}

export interface StockSummary {
  opening_stock_qty: number;
  opening_stock_amount: number;
  consumption_qty: number;
  consumption_amount: number;
  closing_stock_qty: number;
  closing_stock_amount: number;
}

export interface TransactionDetails {
  new_total?: number;
  quantity_subtracted?: number;
  item_id: string;
  username: string;
  new_defective?: number;
  defective_added?: number;
  available_quantity?: number;
  quantity?: number;
  total_cost?: number;
  cost_per_unit?: number;
  defective?: number;
  stock_limit?: number;
}

export interface Transaction {
  operation_type: string;
  transaction_id: string;
  date: string;
  details: TransactionDetails;
  timestamp: string;
}

export interface DailyReportItem {
  description: string;
  rate: number;
  opening_stock_qty: number;
  opening_stock_amount: number;
  inward_qty: number;
  inward_amount: number;
  consumption_qty: number;
  consumption_amount: number;
  balance_qty: number;
  balance_amount: number;
  group_id: string | null;
  group_name: string;
}

export interface DailyReportGroupSummary {
  description: string;
  opening_stock_qty: number;
  opening_stock_amount: number;
  inward_qty: number;
  inward_amount: number;
  consumption_qty: number;
  consumption_amount: number;
  balance_qty: number;
  balance_amount: number;
}

export interface DailyReportTransaction {
  transaction_id: string;
  date: string;
  operation: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface DailyReportData {
  report_period: {
    start_date: string;
    end_date: string;
  };
  items: DailyReportItem[];
  group_summary: DailyReportGroupSummary[];
  transactions: {
    [date: string]: {
      operations: DailyReportTransaction[];
    };
  };
}

export interface WeeklyReportData {
  report_period: {
    start_date: string;
    end_date: string;
  };
  overall_stock_summary: StockSummary;
  daily_report: {
    [date: string]: {
      stock_summary: StockSummary;
      transactions: Transaction[];
    };
  };
}

export interface MonthlyReportData {
  report_period: {
    year: number;
    month: number;
    start_date: string;
    end_date: string;
  };
  overall_stock_summary: StockSummary;
  daily_report: {
    [date: string]: {
      stock_summary: StockSummary;
      transactions: Transaction[];
    };
  };
}

export const OPERATION_TYPES = [
  'All Operations',
  'CreateStock',
  'SubtractStockQuantity',
  'AddStockQuantity',
  'AddDefectiveGoods',
  'PushToProduction',
  'SaveOpeningStock',
  'SaveClosingStock',
  'CreateProduct',
  'UpdateStock'
] as const;

export type OperationType = typeof OPERATION_TYPES[number];

export const SORT_FIELDS = [
  { value: 'timestamp', label: 'Sort by Time' },
  { value: 'operation_type', label: 'Sort by Operation' },
  { value: 'item_id', label: 'Sort by Item ID' },
  { value: 'username', label: 'Sort by Username' }
] as const;

export type SortField = 'name' | 'available' | 'defective' | 'cost' | 'totalCost' | 'stockLimit';
export type SortDirection = 'asc' | 'desc';