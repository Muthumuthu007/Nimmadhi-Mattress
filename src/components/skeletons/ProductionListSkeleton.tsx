import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export const ProductionListSkeleton: React.FC = () => {
    return (
        <div className="space-y-8 p-6 bg-gradient-to-br from-gray-50 to-indigo-50 min-h-screen">
            {/* Header with gradient background */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8">
                <div className="flex justify-between items-center">
                    <div className="space-y-2 flex-1">
                        <Skeleton width="40%" height={32} className="bg-white/20" />
                        <Skeleton width="60%" height={16} className="bg-white/20" />
                    </div>
                    <div className="flex gap-3">
                        <Skeleton width={140} height={44} className="bg-white/20" />
                        <Skeleton width={120} height={44} className="bg-white/20" />
                    </div>
                </div>
            </div>

            {/* Production Form Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="space-y-6">
                    <Skeleton width={200} height={28} />

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Skeleton width={120} height={16} />
                            <Skeleton width="100%" height={48} />
                        </div>
                        <div className="space-y-2">
                            <Skeleton width={120} height={16} />
                            <Skeleton width="100%" height={48} />
                        </div>
                    </div>

                    {/* Selected Product Details */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 space-y-4">
                        <Skeleton width={180} height={20} />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton width="80%" height={14} />
                                    <Skeleton width="60%" height={24} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action Button */}
                    <Skeleton width={200} height={48} />
                </div>
            </div>

            {/* Product List Grid */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="flex justify-between items-center mb-6">
                    <Skeleton width={220} height={28} />
                    <Skeleton width={300} height={44} />
                </div>

                {/* Product Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                            key={i}
                            className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-6 space-y-4"
                        >
                            {/* Product Header */}
                            <div className="flex justify-between items-start">
                                <Skeleton width="70%" height={24} />
                                <Skeleton width={70} height={28} />
                            </div>

                            {/* Product Details */}
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <Skeleton width="40%" height={14} />
                                    <Skeleton width="30%" height={14} />
                                </div>
                                <div className="flex justify-between">
                                    <Skeleton width="50%" height={14} />
                                    <Skeleton width="35%" height={14} />
                                </div>
                                <div className="flex justify-between">
                                    <Skeleton width="45%" height={14} />
                                    <Skeleton width="40%" height={14} />
                                </div>
                            </div>

                            {/* Materials Section */}
                            <div className="space-y-2 pt-2 border-t border-gray-200">
                                <Skeleton width="60%" height={14} />
                                <Skeleton width="100%" height={12} />
                                <Skeleton width="90%" height={12} />
                                <Skeleton width="80%" height={12} />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2">
                                <Skeleton width="48%" height={40} />
                                <Skeleton width="48%" height={40} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
