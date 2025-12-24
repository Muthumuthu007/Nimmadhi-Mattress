import { format } from 'date-fns';

/**
 * Get today's date key in YYYY-MM-DD format
 */
export const getTodayKey = (): string => {
    return format(new Date(), 'yyyy-MM-dd');
};

/**
 * Check if opening stock is saved for today
 */
export const isOpeningStockSaved = (): boolean => {
    const key = `openingSaved_${getTodayKey()}`;
    return localStorage.getItem(key) === 'true';
};

/**
 * Check if closing stock is saved for today
 */
export const isClosingStockSaved = (): boolean => {
    const key = `closingSaved_${getTodayKey()}`;
    return localStorage.getItem(key) === 'true';
};

/**
 * Mark opening stock as saved for today
 */
export const markOpeningStockSaved = (): void => {
    const key = `openingSaved_${getTodayKey()}`;
    localStorage.setItem(key, 'true');
};

/**
 * Mark closing stock as saved for today
 */
export const markClosingStockSaved = (): void => {
    const key = `closingSaved_${getTodayKey()}`;
    localStorage.setItem(key, 'true');
};

/**
 * Clear localStorage entries older than 7 days
 * Call this on app initialization to prevent localStorage bloat
 */
export const clearOldEntries = (): void => {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('openingSaved_') || key.startsWith('closingSaved_'))) {
            const dateStr = key.split('_')[1];
            if (dateStr) {
                const entryDate = new Date(dateStr);
                if (entryDate < sevenDaysAgo) {
                    localStorage.removeItem(key);
                }
            }
        }
    }
};
