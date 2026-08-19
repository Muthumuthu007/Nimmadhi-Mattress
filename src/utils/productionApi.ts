import { apiClient } from './api';

// Types
export interface ProductionRecord {
    id?: string;
    date: string;
    shift: string;
    machine_id: string;
    operator_name: string;
    product_name: string;
    cycle_time: number;
    planned_qty: number;
    actual_qty: number;
    rejected_qty: number;
    efficiency: number;
    downtime_minutes: number;
    remarks?: string;
    status?: string;
}

import { ProductionResponse } from '../types/index';

// Production API wrappers
export const productionApi = {
    create: (data: Omit<ProductionRecord, 'id'>) => {
        return apiClient.post<ProductionResponse>('/api/production/create/', {
            operation: 'CreateProduction',
            ...data
        });
    },

    update: (data: ProductionRecord) => {
        return apiClient.post<ProductionResponse>('/api/production/update/', {
            operation: 'UpdateProduction',
            ...data
        });
    },

    alter: (data: any) => {
        return apiClient.post<ProductionResponse>('/api/production/alter/', {
            operation: 'AlterProduction',
            ...data
        });
    },

    updateDetails: (data: any) => {
        return apiClient.post<ProductionResponse>('/api/production/update-details/', {
            operation: 'UpdateProductionDetails',
            ...data
        });
    },

    list: () => {
        return apiClient.get<ProductionListResponse>('/api/production/list/');
    },

    push: (data: { product_id: string; quantity: number; username: string; production_cost_per_unit: number }) => {
        return apiClient.post<ProductionResponse>('/api/production/push/', data);
    },

    getDailyDispatch: (date: string) => {
        return apiClient.post('/api/reports/production/list-of-undo/', {
            date
        });
    },

    undo: (data: { push_id: string; username: string }) => {
        return apiClient.post<ProductionResponse>('/api/production/undo/', data);
    },

    dailyReport: (date: string) => {
        return apiClient.post('/api/production/daily/', {
            operation: 'GetDailyProduction',
            date
        });
    },

    weeklyReport: (startDate: string, endDate: string) => {
        return apiClient.post('/api/production/weekly/', {
            operation: 'GetWeeklyProduction',
            start_date: startDate,
            end_date: endDate
        });
    },

    monthlyReport: (month: string) => {
        return apiClient.post('/api/production/monthly/', {
            operation: 'GetMonthlyProduction',
            month
        });
    },

    // Admin only endpoints
    delete: (id: string) => {
        return apiClient.post<ProductionResponse>('/api/production/delete/', {
            operation: 'DeleteProduction',
            id
        });
    },

    deletePush: (id: string) => {
        return apiClient.post<ProductionResponse>('/api/production/delete-push/', {
            operation: 'DeletePushProduction',
            id
        });
    },

    deleteProduct: (productId: string) => {
        return apiClient.post<ProductionResponse>('/api/stock/products/delete/', {
            product_id: productId
        });
    }
};

// ─── Product Groups ────────────────────────────────────────────────────────
// Dedicated group service for organizing products into Product Groups.
// Lives alongside productionApi since groups are a Production-module concept.

/** Raw product shape as returned by /api/production/list/ */
export interface ProductionProduct {
    product_id: string;
    product_name: string;
    inventory?: string | number;
    materials?: Array<{
        item_name?: string;
        item_id?: string;
        quantity?: number;
        required_qty?: number;
        group_chain?: string[];
    }>;
    stock_details?: Array<{
        item_name?: string;
        item_id?: string;
        quantity?: number;
        required_qty?: number;
        group_chain?: string[];
    }>;
    stock_needed?: Record<string, string | number>;
    production_cost_total?: number;
    production_cost_breakdown?: Record<string, string | number>;
    max_produce?: number;
    original_max_produce?: number;
    total_cost?: number;
    wastage_percent?: number;
    wastage_amount?: number;
    labour_cost?: number;
    transport_cost?: number;
    other_cost?: number;
    created_at?: string;
    group_id?: string | null;
    group_name?: string | null;
}

/** A single grouped section inside the /api/production/list/ response */
export interface ProductionGroup {
    group_id: string | null;
    group_name: string;
    product_count: number;
    products: ProductionProduct[];
}

/** Full response shape from /api/production/list/ */
export interface ProductionListResponse {
    grouped_products: ProductionGroup[];
    all_products: ProductionProduct[];
    total_products: number;
}

/** A selectable production group, as returned by /api/production/groups/names/ */
export interface ProductGroup {
    group_id: string;
    name: string;
}

export interface GetGroupsResponse {
    groups: ProductGroup[];
    message?: string;
}

export interface CreateGroupResponse {
    message: string;
    group_id: string;
    name: string;
}

export interface MoveProductResponse {
    message: string;
    product_id: string;
    group_id: string;
}

export interface DeleteGroupResponse {
    message: string;
    group_id: string;
    name: string;
}

export const productGroupApi = {
    // Lightweight list of group id/name pairs for populating group selectors.
    // Returns { groups: [{ group_id, name }] } — far cheaper than deriving
    // names from the full production list.
    getGroups: () => {
        return apiClient.get<GetGroupsResponse>('/api/production/groups/names/');
    },

    createGroup: (name: string) => {
        return apiClient.post<CreateGroupResponse>('/api/production/groups/create/', {
            name
        });
    },

    moveProduct: (productId: string, groupId: string) => {
        return apiClient.post<MoveProductResponse>('/api/production/groups/move-product/', {
            product_id: productId,
            group_id: groupId
        });
    },

    deleteGroup: (groupId: string) => {
        return apiClient.post<DeleteGroupResponse>('/api/production/groups/delete/', {
            group_id: groupId
        });
    }
};
