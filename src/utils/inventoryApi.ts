import { axiosInstance } from './axiosInstance';



/**
 * Fetch all inventory stocks using POST endpoint
 */
export async function fetchAllStocks(username: string) {
    try {
        const response = await axiosInstance.post(`/api/stock/list/?_t=${new Date().getTime()}`, {
            username: username,
            _t: new Date().getTime()
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching inventory stocks:', error);
        throw error;
    }
}

/**
 * Save opening stock
 * Note: This endpoint does not require Bearer token authentication,
 * only the username in the payload
 */
export async function saveOpeningStock(username: string) {
    try {
        const response = await axiosInstance.post('/api/stock/opening-stock/', {
            username: username,
            _t: new Date().getTime()
        });
        return response.data;
    } catch (error) {
        console.error('Error saving opening stock:', error);
        throw error;
    }
}

/**
 * Update stock details
 */
export async function updateStockDetails(payload: {
    name: string;
    username: string;
    gst: number;
    cost_per_unit: number;
    unit: string;
    stock_limit: number;
}) {
    try {
        const response = await axiosInstance.put('/api/stock/update/', payload);
        return response.data;
    } catch (error) {
        console.error('Error updating stock details:', error);
        throw error;
    }
}
