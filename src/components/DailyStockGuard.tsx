import React from 'react';
import { useDailyStockGuard } from '../hooks/useDailyStockGuard';
import { OpeningStockOverlay } from './OpeningStockOverlay';
import { ClosingStockBanner } from './ClosingStockBanner';

interface DailyStockGuardProps {
    children: React.ReactNode;
}

/**
 * Wrapper component that enforces daily stock requirements
 * - Shows blocking overlay if opening stock not saved
 * - Shows persistent banner if closing stock not saved
 */
export const DailyStockGuard: React.FC<DailyStockGuardProps> = ({ children }) => {
    const { isOpeningSaved, isClosingSaved, markOpeningSaved, markClosingSaved } = useDailyStockGuard();

    return (
        <>
            {/* Opening Stock: Full blocking overlay (hard enforcement) */}
            {!isOpeningSaved && <OpeningStockOverlay onSaved={markOpeningSaved} />}

            {/* Closing Stock: Persistent banner (soft enforcement) */}
            {!isClosingSaved && <ClosingStockBanner onSaved={markClosingSaved} />}

            {/* Main app content */}
            {children}
        </>
    );
};
