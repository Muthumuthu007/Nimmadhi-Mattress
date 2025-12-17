import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export const ReportSkeleton: React.FC = () => {
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton width={200} height={28} />
                    <Skeleton width={300} height={16} />
                </div>
                <div className="flex gap-3">
                    <Skeleton width={140} height={44} />
                    <Skeleton width={120} height={44} />
                </div>
            </div>

            {/* Filters Section */}
            <div className="bg-white rounded-xl shadow-md p-6">
                <Skeleton width={150} height={20} className="mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Skeleton width={100} height={14} />
                        <Skeleton width="100%" height={44} />
                    </div>
                    <div className="space-y-2">
                        <Skeleton width={100} height={14} />
                        <Skeleton width="100%" height={44} />
                    </div>
                    <div className="space-y-2">
                        <Skeleton width={120} height={14} />
                        <Skeleton width="100%" height={44} />
                    </div>
                </div>
                <div className="mt-4 flex gap-3">
                    <Skeleton width={140} height={40} />
                    <Skeleton width={100} height={40} />
                </div>
            </div>

            {/* Report Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                {/* Table Header */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <Skeleton width={180} height={20} />
                        <Skeleton width={200} height={16} />
                    </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <th key={i} className="px-6 py-3 text-left">
                                        <Skeleton width="80%" height={14} />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((row) => (
                                <tr key={row} className="hover:bg-gray-50">
                                    {[1, 2, 3, 4, 5, 6].map((col) => (
                                        <td key={col} className="px-6 py-4">
                                            <Skeleton width={col % 2 === 0 ? "70%" : "90%"} height={12} />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Table Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                        <Skeleton width={150} height={14} />
                        <div className="flex gap-2">
                            <Skeleton width={80} height={32} />
                            <Skeleton width={80} height={32} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-xl shadow-md p-6">
                        <Skeleton width="60%" height={16} className="mb-3" />
                        <Skeleton width="40%" height={32} className="mb-2" />
                        <Skeleton width="80%" height={12} />
                    </div>
                ))}
            </div>
        </div>
    );
};
