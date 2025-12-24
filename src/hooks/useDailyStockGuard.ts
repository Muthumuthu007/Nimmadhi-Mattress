import { useState, useEffect } from 'react';
import {
    isOpeningStockSaved,
    isClosingStockSaved,
    markOpeningStockSaved as markOpeningSaved,
    markClosingStockSaved as markClosingSaved,
    clearOldEntries
} from '../utils/dailyStockStorage';

export interface DailyStockGuardState {
    isOpeningSaved: boolean;
    isClosingSaved: boolean;
    markOpeningSaved: () => void;
    markClosingSaved: () => void;
}

/**
 * Custom hook to manage daily stock guard state
 * Checks opening/closing stock status and provides callbacks to update them
 */
export const useDailyStockGuard = (): DailyStockGuardState => {
    const [isOpeningSaved, setIsOpeningSaved] = useState(isOpeningStockSaved());
    const [isClosingSaved, setIsClosingSaved] = useState(isClosingStockSaved());

    // Clear old entries on mount
    useEffect(() => {
        clearOldEntries();
    }, []);

    // Check stock status on mount and when date changes
    useEffect(() => {
        const checkStatus = () => {
            setIsOpeningSaved(isOpeningStockSaved());
            setIsClosingSaved(isClosingStockSaved());
        };

        checkStatus();

        // Check every minute to handle date changes
        const interval = setInterval(checkStatus, 60000);

        return () => clearInterval(interval);
    }, []);

    const handleMarkOpeningSaved = () => {
        markOpeningSaved();
        setIsOpeningSaved(true);
    };

    const handleMarkClosingSaved = () => {
        markClosingSaved();
        setIsClosingSaved(true);
    };

    return {
        isOpeningSaved,
        isClosingSaved,
        markOpeningSaved: handleMarkOpeningSaved,
        markClosingSaved: handleMarkClosingSaved,
    };
};
