import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertTriangle, RotateCcw, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { productionApi } from '../utils/productionApi';
import { useAuth } from '../contexts/AuthContext';

interface UndoProductionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUndoSuccess: () => void;
}

interface DispatchItem {
    product_name: string;
    quantity_produced: string | number;
    push_id: string;
    status: string;
    timestamp: string;
    product_id: string;
}

const UndoProductionModal: React.FC<UndoProductionModalProps> = ({
    isOpen,
    onClose,
    onUndoSuccess
}) => {
    const { user } = useAuth();
    const [items, setItems] = useState<DispatchItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [undoingId, setUndoingId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchDailyDispatch();
        }
    }, [isOpen]);

    const fetchDailyDispatch = async () => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const today = format(new Date(), 'yyyy-MM-dd');
            const response = await productionApi.getDailyDispatch(today);

            if (response.data && Array.isArray(response.data.items)) {
                // Filter for ACTIVE items only as per requirement
                const activeItems = response.data.items.filter(
                    (item: any) => (item.status === 'ACTIVE' || item.status === 'Active')
                );
                // Sort by timestamp desc (newest first)
                activeItems.sort((a: any, b: any) => {
                    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
                });
                setItems(activeItems);
            } else {
                setItems([]);
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to fetch today\'s production records.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUndo = async (pushId: string) => {
        if (!pushId) return;

        setUndoingId(pushId);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await productionApi.undo({
                push_id: pushId,
                username: user.username
            });

            const data = response.data;

            if (data.message === "Production undone successfully" ||
                data.message?.includes('successfully') ||
                (data as any).status === "success") {
                // Remove the item from the list
                setItems(prev => prev.filter(item => item.push_id !== pushId));
                setSuccessMessage(data.message || 'Production undone successfully');
                onUndoSuccess();
            } else {
                setError(data.message || 'Failed to undo production.');
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to undo production.');
        } finally {
            setUndoingId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                        <RotateCcw className="h-5 w-5 mr-2" />
                        Undo Production (Today)
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md flex items-start border border-red-200 dark:border-red-800">
                            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                            <p>{error}</p>
                        </div>
                    )}

                    {successMessage && (
                        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md flex items-start border border-green-200 dark:border-green-800">
                            <div className="mr-2 flex-shrink-0 mt-0.5">✓</div>
                            <p>{successMessage}</p>
                        </div>
                    )}

                    {isLoading && items.length === 0 ? (
                        <div className="flex justify-center items-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            No active production records found for today.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {items.map((item) => (
                                <div
                                    key={item.push_id}
                                    className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-gray-200 dark:border-gray-700"
                                >
                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-900 dark:text-white">{item.product_name}</h4>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 space-y-1">
                                            <p>Quantity: <span className="font-medium text-gray-700 dark:text-gray-300">{item.quantity_produced}</span></p>
                                            <p className="text-xs">Push ID: <span className="font-mono">{item.push_id}</span></p>
                                            <p className="text-xs">{format(new Date(item.timestamp), 'h:mm a')}</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleUndo(item.push_id)}
                                        disabled={undoingId === item.push_id || !!undoingId} // Disable if any undo is in progress
                                        className={`flex items-center justify-center px-4 py-2 rounded-md transition-colors whitespace-nowrap
                       ${undoingId === item.push_id
                                                ? 'bg-red-100 text-red-800 cursor-not-allowed'
                                                : 'bg-white dark:bg-gray-600 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30'
                                            }
                     `}
                                    >
                                        {undoingId === item.push_id ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                Undoing...
                                            </>
                                        ) : (
                                            <>
                                                <RotateCcw className="h-4 w-4 mr-2" />
                                                Undo
                                            </>
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounding-b-lg">
                    <button
                        onClick={fetchDailyDispatch}
                        className="flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                    >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Refresh List
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UndoProductionModal;
