import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export const CostingSkeleton: React.FC = () => {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton width={300} height={32} />
                    <Skeleton width={400} height={16} />
                </div>
                <div className="flex gap-2">
                    <Skeleton width={120} height={44} />
                    <Skeleton width={180} height={44} />
                </div>
            </div>

            {/* Casting Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                        {/* Card Header */}
                        <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                            <Skeleton width="70%" height={24} className="mb-2" />
                            <Skeleton width="40%" height={12} />
                        </div>

                        {/* Card Body */}
                        <div className="p-4 space-y-4">
                            {/* Stock Recipe Section */}
                            <div>
                                <Skeleton width={120} height={12} className="mb-2" />
                                <div className="bg-gray-50 p-2 rounded space-y-2">
                                    <Skeleton width="100%" height={16} />
                                    <Skeleton width="100%" height={16} />
                                    <Skeleton width="80%" height={16} />
                                </div>
                            </div>

                            {/* Cost Breakdown Section */}
                            <div>
                                <Skeleton width={100} height={12} className="mb-2" />
                                <div className="grid grid-cols-2 gap-2">
                                    <Skeleton width="100%" height={16} />
                                    <Skeleton width="100%" height={16} />
                                    <Skeleton width="100%" height={16} />
                                    <Skeleton width="100%" height={16} />
                                </div>
                            </div>

                            {/* Total Cost */}
                            <div className="pt-2 border-t border-dashed border-gray-300 flex justify-between items-center">
                                <Skeleton width={100} height={16} />
                                <Skeleton width={120} height={32} />
                            </div>
                        </div>

                        {/* Card Footer */}
                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex gap-2">
                            <Skeleton width="50%" height={40} />
                            <Skeleton width="50%" height={40} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
