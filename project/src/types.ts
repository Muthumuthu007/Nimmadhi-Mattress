export interface RawMaterial {
  id: string;
  name: string;
  available: number;
  defectiveQuantity?: number;
  unit: string;
  cost: number;
  minStockLimit?: number;
  created_at: string;
  inventory?: number;
  max_produce?: number;
  product_name?: string;
  production_cost?: number;
  production_cost_total?: number;
  original_max_produce?: number;
  username?: string;
  product_id?: string;
  totalQuantity?: number;
}

export interface Product {
  id: string;
  name: string;
  inventory?: number;
  maxProduce: number;
  originalMaxProduce: number;
  productionCostTotal: number;
  productionCostBreakdown: Record<string, string | number>;
  stockNeeded: Record<string, string | number>;
  createdAt: string;
  materials: Array<{
    materialName: string;
    quantity: number;
  }>;
  wastage: number;
  wastageAmount: number;
  laborCost: number;
  totalCost: number;
  groupChain: Record<string, string>;
  transportCost?: number;
  otherCost?: number;
} 