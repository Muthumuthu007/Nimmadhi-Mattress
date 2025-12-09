import { AxiosError } from 'axios';
import { axiosInstance } from './axiosInstance';

export interface CreateGrnPayload {
  date: string;
  supplierName: string;
  rawMaterial: string;
  billNumber: string;
  billDate: string;
  billedQuantity: number;
  receivedQuantity: number;
  transport: string;
  tallyReference: string;
  costing: number;
  taxPercentage: number;
  sgstAmount: number;
  cgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

export interface CreateGrnResponse extends CreateGrnPayload {
  message: string;
  grnId: string;
  created_at?: string;
}

export async function createGrn(payload: CreateGrnPayload): Promise<CreateGrnResponse> {
  try {
    const response = await axiosInstance.post<CreateGrnResponse>('/api/grn/create/', payload);
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to create GRN',
      );
    }
    throw error;
  }
}

export interface GrnRecord {
  billNumber: string;
  supplierName: string;
  created_at?: string;
  transport: string;
  totalAmount: number;
  receivedQuantity: number;
  grnId: string;
  costing: number;
  sgstAmount: number;
  tallyReference: string;
  date: string;
  cgstAmount: number;
  igstAmount: number;
  rawMaterial: string;
  billDate: string;
  billedQuantity: number;
  taxPercentage: number;
}

export async function getGrnById(grnId: string): Promise<GrnRecord> {
  try {
    const response = await axiosInstance.get<GrnRecord>(`/api/grn/${grnId}/`);
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch GRN',
      );
    }
    throw error;
  }
}

export interface GrnListResponse {
  message?: string;
  transport_type?: string;
  supplierName?: string;
  data?: GrnRecord[];
}

export async function getGrnByTransport(transportType: string): Promise<GrnRecord[]> {
  try {
    const response = await axiosInstance.get<GrnListResponse>(`/api/grn/transport/${encodeURIComponent(transportType)}/`);
    return response.data?.data || [];
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch GRNs by transport',
      );
    }
    throw error;
  }
}

export async function getGrnBySupplier(supplierName: string): Promise<GrnRecord[]> {
  try {
    const response = await axiosInstance.get<GrnListResponse>(`/api/grn/supplier/${encodeURIComponent(supplierName)}/`);
    return response.data?.data || [];
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch GRNs by supplier',
      );
    }
    throw error;
  }
}

export async function getAllGrns(): Promise<GrnRecord[]> {
  try {
    const response = await axiosInstance.get<GrnListResponse | GrnRecord[]>('/api/grn/list/');

    // Log response for debugging (can be removed in production)
    console.log('getAllGrns response:', response.data);

    // Handle different response formats
    // Case 1: Response is an array directly
    if (Array.isArray(response.data)) {
      return response.data;
    }

    // Case 2: Response is wrapped in a data property
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      const listResponse = response.data as GrnListResponse;
      if (Array.isArray(listResponse.data)) {
        return listResponse.data;
      }
    }

    // Case 3: Response might be a direct object with array inside
    if (response.data && typeof response.data === 'object') {
      const data = response.data as any;
      // Check if it has a 'data' property that's an array
      if (data.data && Array.isArray(data.data)) {
        return data.data;
      }
      // Check if response itself has array properties
      if (data.items && Array.isArray(data.items)) {
        return data.items;
      }
      if (data.results && Array.isArray(data.results)) {
        return data.results;
      }
    }

    // If we can't parse the response, return empty array and log warning
    console.warn('getAllGrns: Unexpected response format', response.data);
    return [];
  } catch (error) {
    if (error instanceof AxiosError) {
      // Log the actual response for debugging
      console.error('getAllGrns error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        code: error.code,
      });

      throw new Error(
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch GRNs',
      );
    }
    throw error;
  }
}

export interface DeleteGrnResponse {
  message: string;
  grnId: string;
}

export async function deleteGrn(grnId: string): Promise<DeleteGrnResponse> {
  try {
    const response = await axiosInstance.delete<DeleteGrnResponse>(`/api/grn/${grnId}/delete/`);
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to delete GRN',
      );
    }
    throw error;
  }
}


