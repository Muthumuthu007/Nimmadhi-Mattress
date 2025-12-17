import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export const AdminSkeleton: React.FC = () => {
    return (
        <div className="space-y-6">
            {/* Header */}
            <Skeleton width={200} height={32} />

            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="flex border-b">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex-1 px-4 py-3">
                            <Skeleton width="80%" height={20} />
                        </div>
                    ))}
                </div>

                {/* Content Area */}
                <div className="p-6 space-y-4">
                    {/* Form Fields */}
                    <div className="space-y-4">
                        <div>
                            <Skeleton width={120} height={14} className="mb-2" />
                            <Skeleton width="100%" height={44} />
                        </div>
                        <div>
                            <Skeleton width={120} height={14} className="mb-2" />
                            <Skeleton width="100%" height={44} />
                        </div>
                        <div>
                            <Skeleton width={120} height={14} className="mb-2" />
                            <Skeleton width="100%" height={44} />
                        </div>
                    </div>

                    {/* Button */}
                    <Skeleton width="100%" height={44} />

                    {/* Table */}
                    <div className="mt-6">
                        <Skeleton width="100%" height={44} className="mb-4" />
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} width="100%" height={48} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
