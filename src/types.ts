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
  gst?: number;
  gst_amount?: number;
  total_cost?: number;
  updated_at?: string;
  group_id?: string;
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
  /** Product Group this product belongs to, as returned by grouped_products */
  groupId?: string | null;
  groupName?: string | null;
}

/** A single section from the API's grouped_products response */
export interface ProductGroupSection {
  groupId: string | null;
  groupName: string;
  productCount: number;
  products: Product[];
}