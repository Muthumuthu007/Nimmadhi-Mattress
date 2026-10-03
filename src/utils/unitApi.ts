import { apiClient } from './api';

export type UnitStatus = 'READY_FOR_DISPATCH' | 'IN_TRANSIT' | 'RECEIVED';

export interface ProductUnit {
  unit_id: string;
  unit_sequence?: number;
  movement_status: UnitStatus;
  qr_payload?: { unit_id: string };
}

export interface UnitGenerationResponse {
  message: string;
  batch_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  destination_id: string | null;
  generated_at: string;
  units: ProductUnit[];
}

const withKey = (idempotencyKey: string) => ({
  headers: { 'Idempotency-Key': idempotencyKey },
});

/** APIs for a single physical, QR-labelled product unit. */
export const unitApi = {
  generate: (productId: string, quantity: number, idempotencyKey: string) =>
    apiClient.post<UnitGenerationResponse>(
      `/api/production/${encodeURIComponent(productId)}/units/generate/`,
      { quantity },
      withKey(idempotencyKey),
    ),
  listForProduct: (productId: string) =>
    apiClient.get<{ product_id: string; total: number; units: ProductUnit[] }>(
      `/api/production/${encodeURIComponent(productId)}/units/`,
    ),
  getQr: (unitId: string) =>
    apiClient.get<{ unit_id: string; product_name: string; unit_sequence?: number; movement_status: UnitStatus; qr_payload: string }>(
      `/api/production/units/${encodeURIComponent(unitId)}/qr/`,
    ),
  dispatch: (unitId: string, destinationId: string, idempotencyKey: string) =>
    apiClient.post(
      '/api/production/units/scan/dispatch/',
      { unit_id: unitId, destination_id: destinationId },
      withKey(idempotencyKey),
    ),
  tracking: (unitId: string) =>
    apiClient.get(`/api/production/units/${encodeURIComponent(unitId)}/tracking/`),
  movements: (unitId: string) =>
    apiClient.get(`/api/production/units/${encodeURIComponent(unitId)}/movements/`),
};

export const newIdempotencyKey = (prefix: string) => {
  const random = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
};
