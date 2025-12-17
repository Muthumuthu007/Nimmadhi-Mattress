import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export const GRNSkeleton: React.FC = () => {
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <Skeleton width={280} height={32} />
                <div className="flex gap-3">
                    <Skeleton width={160} height={44} />
                    <Skeleton width={140} height={44} />
                </div>
            </div>

            {/* Search and Filter Section */}
            <div className="bg-white rounded-xl shadow-md p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="space-y-2">
                        <Skeleton width={100} height={16} />
                        <Skeleton width="100%" height={44} />
                    </div>
                    <div className="space-y-2">
                        <Skeleton width={120} height={16} />
                        <Skeleton width="100%" height={44} />
                    </div>
                    <div className="space-y-2">
                        <Skeleton width={100} height={16} />
                        <Skeleton width="100%" height={44} />
                    </div>
                </div>
                <div className="flex gap-3">
                    <Skeleton width={120} height={40} />
                    <Skeleton width={100} height={40} />
                </div>
            </div>

            {/* GRN Cards List */}
            <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div
                        key={i}
                        className="bg-white rounded-xl shadow-md p-6 border border-gray-200"
                    >
                        {/* GRN Header */}
                        <div className="flex justify-between items-start mb-4">
                            <div className="space-y-2 flex-1">
                                <Skeleton width="40%" height={24} />
                                <Skeleton width="30%" height={16} />
                            </div>
                            <Skeleton width={100} height={32} />
                        </div>

                        {/* GRN Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            {[1, 2, 3, 4].map((j) => (
                                <div key={j} className="space-y-1">
                                    <Skeleton width="70%" height={12} />
                                    <Skeleton width="90%" height={18} />
                                </div>
                            ))}
                        </div>

                        {/* Materials Table */}
                        <div className="border-t border-gray-200 pt-4">
                            <Skeleton width={150} height={18} className="mb-3" />
                            <div className="space-y-2">
                                {[1, 2, 3].map((k) => (
                                    <div key={k} className="flex justify-between items-center py-2 border-b border-gray-100">
                                        <Skeleton width="40%" height={14} />
                                        <Skeleton width="15%" height={14} />
                                        <Skeleton width="15%" height={14} />
                                        <Skeleton width="15%" height={14} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                            <Skeleton width={100} height={36} />
                            <Skeleton width={120} height={36} />
                            <Skeleton width={100} height={36} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-2">
                <Skeleton width={40} height={40} />
                <Skeleton width={40} height={40} />
                <Skeleton width={40} height={40} />
                <Skeleton width={40} height={40} />
            </div>
        </div>
    );
};
