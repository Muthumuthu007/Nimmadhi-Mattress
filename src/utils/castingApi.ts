import { AxiosError } from 'axios';
import { axiosInstance } from './axiosInstance';

// ─── Create ─────────────────────────────────────────────────────────────────

export interface CreateCastingPayload {
  product_name: string;
  selected_items: string[]; // array of material names (not IDs)
  username: string;
  labour_cost: number;
  transport_cost: number;
  other_cost: number;
  wastage_percent: number;
}

export interface CreateCastingResponse {
  message: string;
  product_id: string;
  product_name: string;
  stock_needed: { [material_name: string]: string };
  max_produce: number;
  production_cost_breakdown: { [material_name: string]: string };
  production_cost_total: number;
  wastage_percent: number;
  wastage_amount: number;
  labour_cost: number;
  transport_cost: number;
  other_cost: number;
  total_cost: number;
}

export async function createCastingProduct(
  payload: CreateCastingPayload
): Promise<CreateCastingResponse> {
  try {
    const response = await axiosInstance.post<CreateCastingResponse>('/api/casting/create/', payload);
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to create casting product'
      );
    }
    throw error;
  }
}

// ─── View / List ─────────────────────────────────────────────────────────────

export interface CastingProductResponse {
  product_id: string;
  product_name: string;
  /** Keys are material names, values are quantity strings */
  stock_needed: { [material_name: string]: string };
  max_produce?: number;
  production_cost_breakdown?: { [material_name: string]: string };
  production_cost_total?: number;
  wastage_percent: number;
  wastage_amount: number;
  labour_cost: number;
  transport_cost: number;
  other_cost: number;
  total_cost: number;
  created_at: string;
}

export interface ViewCastingsResponse {
  products?: CastingProductResponse[];
  items?: CastingProductResponse[];
  data?: { products?: CastingProductResponse[]; items?: CastingProductResponse[] } | CastingProductResponse[];
  results?: CastingProductResponse[];
}

const extractCastingProducts = (
  payload: ViewCastingsResponse | CastingProductResponse[] | undefined
): CastingProductResponse[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.products)) return payload.products;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.results)) return payload.results;
  if (payload.data) {
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray((payload.data as any).products)) return (payload.data as any).products;
    if (Array.isArray((payload.data as any).items)) return (payload.data as any).items;
  }
  return [];
};

export async function viewCastings(): Promise<CastingProductResponse[]> {
  try {
    const response = await axiosInstance.get<ViewCastingsResponse | CastingProductResponse[]>('/api/casting/list/');
    return extractCastingProducts(response.data);
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch casting products'
      );
    }
    throw error;
  }
}

// ─── Update (quantity-only edit) ─────────────────────────────────────────────

export interface UpdateCastingPayload {
  product_id: string;
  /** Keys are material names, values are updated quantities (numbers) */
  stock_needed: { [material_name: string]: number };
}

export interface UpdateCastingResponse {
  message: string;
  product_id: string;
  product_name: string;
  /** Returned quantities are numbers after an edit */
  stock_needed: { [material_name: string]: number };
  max_produce: number;
  production_cost_breakdown: { [material_name: string]: number };
  production_cost_total: number;
  wastage_percent: number;
  wastage_amount: number;
  labour_cost: number;
  transport_cost: number;
  other_cost: number;
  total_cost: number;
}

export async function updateCastingQuantities(
  payload: UpdateCastingPayload
): Promise<UpdateCastingResponse> {
  try {
    const response = await axiosInstance.post<UpdateCastingResponse>(
      '/api/casting/edit-raw-materials/',
      payload
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to update casting quantities'
      );
    }
    throw error;
  }
}

// ─── Move to Production ───────────────────────────────────────────────────────

export interface MoveToProductionPayload {
  operation: string;
  product_id: string;
  username: string;
}

export interface MoveToProductionResponse {
  message: string;
}

export async function moveToProduction(
  payload: MoveToProductionPayload
): Promise<MoveToProductionResponse> {
  try {
    const response = await axiosInstance.post<MoveToProductionResponse>('/api/casting/move-to-production/', payload);
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to move casting product to production'
      );
    }
    throw error;
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export interface DeleteCastingPayload {
  operation: string;
  product_id: string;
  username: string;
}

export interface DeleteCastingResponse {
  message: string;
}

export async function deleteCastingProduct(
  payload: DeleteCastingPayload
): Promise<DeleteCastingResponse> {
  try {
    const response = await axiosInstance.post<DeleteCastingResponse>('/api/casting/delete/', payload);
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to delete casting product'
      );
    }
    throw error;
  }
}
