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

    list: (username: string, filters?: any) => {
        return apiClient.post('/api/production/list/', {
            username: username,
            ...filters
        });
    },

    push: (data: { product_id: string; quantity: number; username: string; production_cost_per_unit: number }) => {
        return apiClient.post<ProductionResponse>('/api/production/push/', data);
    },

    getDailyDispatch: (date: string) => {
        return apiClient.post('/api/reports/production/daily/', {
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
