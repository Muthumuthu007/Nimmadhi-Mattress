import React, { useState } from 'react';
import { Lock, Save, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { axiosInstance } from '../utils/axiosInstance';

interface OpeningStockOverlayProps {
    onSaved: () => void;
}

export const OpeningStockOverlay: React.FC<OpeningStockOverlayProps> = ({ onSaved }) => {
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        setSaving(true);
        setError(null);

        try {
            const response = await axiosInstance.post('/api/stock/opening-stock/', {
                username: user.username,
            });

            if (response.data?.message?.includes('successfully')) {
                // Wait a moment for visual feedback
                setTimeout(() => {
                    onSaved();
                }, 500);
            } else {
                setError('Failed to save opening stock');
            }
        } catch (err: any) {
            console.error('Error saving opening stock:', err);
            setError(err?.response?.data?.message || err?.message || 'Failed to save opening stock');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-gray-900/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-700"></div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border border-gray-200 dark:border-gray-700 relative z-10 animate-in fade-in zoom-in duration-300">
                <div className="mx-auto w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-6 animate-bounce-slow">
                    <Lock className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Opening Stock Required
                </h2>

                <p className="text-gray-600 dark:text-gray-300 mb-8">
                    Please save the opening stock for today to proceed. This ensures accurate inventory tracking for the day.
                </p>

                {error && (
                    <div className="mb-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 text-left rounded-r">
                        <div className="flex items-start">
                            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                        </div>
                    </div>
                )}

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                >
                    {saving ? (
                        <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Saving Opening Stock...
                        </>
                    ) : (
                        <>
                            <Save className="h-5 w-5 mr-2" />
                            Save Opening Stock
                        </>
                    )}
                </button>

                <p className="mt-6 text-xs text-center text-gray-500 dark:text-gray-400">
                    This action is mandatory to access the dashboard.
                </p>
            </div>

            <style>{`
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(-5%); }
                    50% { transform: translateY(5%); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 3s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
};
