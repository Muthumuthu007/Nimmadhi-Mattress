import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export const InventorySkeleton: React.FC = () => {
    return (
        <div className="p-6 space-y-6">
            {/* Header with Action Buttons */}
            <div className="flex justify-between items-center mb-6">
                <Skeleton width={280} height={32} />
                <div className="flex space-x-4">
                    <Skeleton width={180} height={44} />
                    <Skeleton width={200} height={44} />
                    <Skeleton width={150} height={44} />
                    <Skeleton width={160} height={44} />
                </div>
            </div>

            {/* Group Tree / Inventory Table */}
            <div className="bg-white rounded-xl shadow-md p-6">
                {/* Table Header */}
                <div className="grid grid-cols-9 gap-4 pb-4 border-b border-gray-200 mb-4">
                    <Skeleton width="80%" height={16} />
                    <Skeleton width="80%" height={16} />
                    <Skeleton width="80%" height={16} />
                    <Skeleton width="80%" height={16} />
                    <Skeleton width="80%" height={16} />
                    <Skeleton width="80%" height={16} />
                    <Skeleton width="80%" height={16} />
                    <Skeleton width="80%" height={16} />
                    <Skeleton width="80%" height={16} />
                </div>

                {/* Group Rows */}
                {[1, 2, 3].map((groupIndex) => (
                    <div key={groupIndex} className="mb-6">
                        {/* Group Header */}
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 mb-3">
                            <div className="flex items-center gap-3">
                                <Skeleton width={24} height={24} variant="circular" />
                                <Skeleton width={200} height={20} />
                            </div>
                        </div>

                        {/* Material Items */}
                        {[1, 2, 3, 4].map((itemIndex) => (
                            <div
                                key={itemIndex}
                                className="grid grid-cols-9 gap-4 py-3 border-b border-gray-100 hover:bg-gray-50"
                            >
                                <Skeleton width="90%" height={14} />
                                <Skeleton width="60%" height={14} />
                                <Skeleton width="60%" height={14} />
                                <Skeleton width="70%" height={14} />
                                <Skeleton width="50%" height={14} />
                                <Skeleton width="70%" height={14} />
                                <Skeleton width="80%" height={14} />
                                <Skeleton width="60%" height={14} />
                                <div className="flex gap-2">
                                    <Skeleton width={32} height={32} variant="circular" />
                                    <Skeleton width={32} height={32} variant="circular" />
                                    <Skeleton width={32} height={32} variant="circular" />
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Defective Report Section */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-red-50 border-b border-red-200 p-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <Skeleton width={40} height={40} variant="circular" />
                            <div className="space-y-2">
                                <Skeleton width={180} height={20} />
                                <Skeleton width={120} height={14} />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Skeleton width={180} height={36} />
                            <Skeleton width={40} height={36} />
                            <Skeleton width={40} height={36} />
                        </div>
                    </div>
                </div>

                {/* Defective Report Table */}
                <div className="p-4">
                    <div className="grid grid-cols-4 gap-4 pb-3 border-b border-gray-200 mb-3">
                        <Skeleton width="60%" height={14} />
                        <Skeleton width="60%" height={14} />
                        <Skeleton width="60%" height={14} />
                        <Skeleton width="60%" height={14} />
                    </div>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="grid grid-cols-4 gap-4 py-3 border-b border-gray-100">
                            <Skeleton width="80%" height={12} />
                            <Skeleton width="70%" height={12} />
                            <Skeleton width="90%" height={12} />
                            <Skeleton width="100%" height={12} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
