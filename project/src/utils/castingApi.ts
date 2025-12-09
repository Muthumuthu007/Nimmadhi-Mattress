import axios, { AxiosError } from 'axios';
import { authService } from './authService';

const CASTING_API_ENV_BASE = import.meta.env.VITE_CASTING_API_BASE_URL;
const CASTING_API_BASE_URL = CASTING_API_ENV_BASE
  ? CASTING_API_ENV_BASE.endsWith('/')
    ? CASTING_API_ENV_BASE
    : `${CASTING_API_ENV_BASE}/`
  : '/api/casting/';

export const castingApiClient = axios.create({
  baseURL: CASTING_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000
});

// Add request interceptor to attach JWT token
castingApiClient.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface CreateCastingPayload {
  operation: string;
  product_name: string;
  stock_needed: { [item_id: string]: number };
  username: string;
  wastage_percent: number;
  transport_cost: number;
  labour_cost: number;
  other_cost: number;
}

export interface CreateCastingResponse {
  message: string;
  product_id: string;
  production_cost_total: number;
  wastage_percent: number;
  wastage_amount: number;
  transport_cost: number;
  labour_cost: number;
  other_cost: number;
  total_cost: number;
}

export async function createCastingProduct(
  payload: CreateCastingPayload
): Promise<CreateCastingResponse> {
  try {
    const response = await castingApiClient.post<CreateCastingResponse>('create/', payload);
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

export interface CastingProductResponse {
  product_id: string;
  product_name: string;
  stock_needed: { [item_id: string]: number };
  wastage_percent: number;
  wastage_amount: number;
  transport_cost: number;
  labour_cost: number;
  other_cost: number;
  total_cost: number;
  created_at: string;
}

export interface ViewCastingsResponse {
  products?: CastingProductResponse[];
  items?: CastingProductResponse[];
  data?: {
    products?: CastingProductResponse[];
    items?: CastingProductResponse[];
  } | CastingProductResponse[];
  results?: CastingProductResponse[];
}

const extractCastingProducts = (payload: ViewCastingsResponse | CastingProductResponse[] | undefined): CastingProductResponse[] => {
  if (!payload) return [];

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.products)) {
    return payload.products;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  if (Array.isArray(payload.results)) {
    return payload.results;
  }

  if (payload.data) {
    if (Array.isArray(payload.data)) {
      return payload.data;
    }

    if (Array.isArray(payload.data.products)) {
      return payload.data.products;
    }

    if (Array.isArray(payload.data.items)) {
      return payload.data.items;
    }
  }

  console.warn('Unable to determine casting payload structure', payload);
  return [];
};

export async function viewCastings(): Promise<CastingProductResponse[]> {
  try {
    const response = await castingApiClient.get<ViewCastingsResponse | CastingProductResponse[]>('list/');
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
    const response = await castingApiClient.post<MoveToProductionResponse>('move-to-production/', payload);
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
    const response = await castingApiClient.post<DeleteCastingResponse>('delete/', payload);
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

