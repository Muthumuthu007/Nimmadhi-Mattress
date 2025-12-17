import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export const DashboardSkeleton: React.FC = () => {
    return (
        <div className="p-6 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl shadow-md p-6 border border-gray-200"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1 space-y-3">
                                <Skeleton width="60%" height={16} variant="text" />
                                <Skeleton width="40%" height={32} variant="text" />
                                <Skeleton width="50%" height={14} variant="text" />
                            </div>
                            <Skeleton width={64} height={64} variant="circular" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Monthly Summary Section */}
            <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                    <Skeleton width={200} height={24} variant="text" />
                    <div className="flex gap-3">
                        <Skeleton width={120} height={40} />
                        <Skeleton width={120} height={40} />
                    </div>
                </div>

                {/* Summary Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton width="80%" height={14} variant="text" />
                            <Skeleton width="60%" height={24} variant="text" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Product Catalog Grid */}
            <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                    <Skeleton width={180} height={24} variant="text" />
                    <div className="flex gap-3">
                        <Skeleton width={200} height={40} />
                        <Skeleton width={100} height={40} />
                    </div>
                </div>

                {/* Product Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                            key={i}
                            className="border border-gray-200 rounded-lg p-4 space-y-3"
                        >
                            <div className="flex justify-between items-start">
                                <Skeleton width="70%" height={20} variant="text" />
                                <Skeleton width={60} height={24} />
                            </div>
                            <Skeleton width="50%" height={14} variant="text" />
                            <div className="space-y-2">
                                <Skeleton width="100%" height={12} variant="text" />
                                <Skeleton width="90%" height={12} variant="text" />
                                <Skeleton width="80%" height={12} variant="text" />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Skeleton width="48%" height={36} />
                                <Skeleton width="48%" height={36} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
