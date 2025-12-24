import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader2, Save, X, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { axiosInstance } from '../utils/axiosInstance';

interface ClosingStockBannerProps {
    onSaved: () => void;
}

export const ClosingStockBanner: React.FC<ClosingStockBannerProps> = ({ onSaved }) => {
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [timeRemaining, setTimeRemaining] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);

    // Calculate time remaining until midnight
    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const midnight = new Date();
            midnight.setHours(24, 0, 0, 0); // Next midnight

            const diff = midnight.getTime() - now.getTime();
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);

            // Mark as urgent if less than 2 hours remaining
            setIsUrgent(hours < 2);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setError(null);

        try {
            const response = await axiosInstance.post('/api/stock/closing-stock/', {
                username: user.username,
            });

            if (response.data?.message?.includes('successfully')) {
                // Wait a moment for visual feedback
                setTimeout(() => {
                    onSaved();
                }, 500);
            } else {
                setError('Failed to save closing stock');
            }
        } catch (err: any) {
            console.error('Error saving closing stock:', err);
            setError(err?.response?.data?.message || err?.message || 'Failed to save closing stock');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            {/* Animated gradient background with pulse effect */}
            <div className={`fixed top-0 left-0 right-0 z-50 text-white shadow-2xl animate-gradient-x overflow-hidden ${isUrgent ? 'bg-gradient-to-r from-red-700 via-red-600 to-red-700' : 'bg-gradient-to-r from-red-600 via-red-500 to-red-600'}`}>
                {/* Pulsing overlay - more intense when urgent */}
                <div className={`absolute inset-0 bg-red-700 ${isUrgent ? 'opacity-70 animate-pulse-fast' : 'opacity-50 animate-pulse'}`}></div>

                {/* Animated stripes in background */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-slide-right"></div>
                </div>

                <div className="container mx-auto px-4 py-3 relative z-10">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        {/* Message with animations */}
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Bouncing alert icon */}
                            <div className={isUrgent ? 'animate-bounce-fast' : 'animate-bounce'}>
                                <AlertCircle className="h-6 w-6 flex-shrink-0 drop-shadow-lg" />
                            </div>

                            {/* Rotating clock icon */}
                            <div className="animate-spin-slow">
                                <Clock className="h-5 w-5 flex-shrink-0 opacity-90" />
                            </div>

                            {/* Text with slide-in animation */}
                            <div className="flex items-center gap-2 animate-slide-in">
                                <span className="text-sm sm:text-base font-bold tracking-wide drop-shadow-md">
                                    🔴 CLOSING STOCK NOT SAVED
                                </span>
                                <span className="hidden sm:inline text-sm font-medium animate-pulse">
                                    - Please save before day ends
                                </span>
                            </div>

                            {/* Countdown Timer */}
                            <div className="flex items-center gap-2">
                                <div className={`px-4 py-1.5 rounded-lg font-mono font-bold text-base sm:text-lg ${isUrgent ? 'bg-yellow-400 text-red-900' : 'bg-red-800/80 text-yellow-300'} shadow-lg backdrop-blur-sm`}>
                                    ⏰ {timeRemaining}
                                </div>
                            </div>

                            {/* Blinking dot */}
                            <div className={`w-3 h-3 ${isUrgent ? 'bg-yellow-400' : 'bg-yellow-300'} rounded-full animate-ping`}></div>
                        </div>

                        {/* Action Button with hover effects */}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-white hover:bg-yellow-50 disabled:bg-gray-300 text-red-600 font-bold py-2.5 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl hover:scale-105 disabled:cursor-not-allowed whitespace-nowrap transform hover:-translate-y-0.5 active:scale-95"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-5 w-5 animate-pulse" />
                                    Save Closing Stock Now
                                </>
                            )}
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mt-2 bg-red-800 rounded p-2 flex items-center justify-between animate-shake">
                            <span className="text-sm font-semibold">{error}</span>
                            <button
                                onClick={() => setError(null)}
                                className="text-white hover:text-red-200 transition-colors"
                                title="Dismiss error"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Spacer to prevent content from being hidden under the banner */}
            <div className="h-16 sm:h-14" />

            {/* Add keyframe animations to global styles */}
            <style>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes slide-right {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes slide-in {
          0% { transform: translateX(-20px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        @keyframes shake-continuous {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          10% { transform: translateX(-2px) rotate(-1deg); }
          20% { transform: translateX(2px) rotate(1deg); }
          30% { transform: translateX(-2px) rotate(-1deg); }
          40% { transform: translateX(2px) rotate(1deg); }
          50% { transform: translateX(-2px) rotate(-1deg); }
          60% { transform: translateX(2px) rotate(1deg); }
          70% { transform: translateX(-2px) rotate(-1deg); }
          80% { transform: translateX(2px) rotate(1deg); }
          90% { transform: translateX(-2px) rotate(-1deg); }
        }

        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }

        .animate-slide-right {
          animation: slide-right 3s linear infinite;
        }

        .animate-slide-in {
          animation: slide-in 0.5s ease-out;
        }

        .animate-shake {
          animation: shake 0.5s;
        }

        .animate-shake-continuous {
          animation: shake-continuous 1s ease-in-out infinite;
        }

        .animate-pulse-fast {
          animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .animate-bounce-fast {
          animation: bounce 0.5s infinite;
        }

        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </>
    );
};
