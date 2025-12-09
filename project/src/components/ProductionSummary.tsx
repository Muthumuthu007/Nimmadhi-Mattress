import React from 'react';
import { Box, AlertCircle } from 'lucide-react';
import { ProductionSummary } from '../types';

interface ProductionSummaryProps {
  summaries: ProductionSummary[];
}

export const ProductionSummaryView: React.FC<ProductionSummaryProps> = ({ summaries }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <Box className="h-5 w-5 mr-2" />
        Production Capacity Summary
      </h2>
      <div className="space-y-4">
        {summaries.map(summary => (
          <div 
            key={summary.productId}
            className="border-l-4 border-indigo-500 pl-4 py-2"
          >
            <h3 className="font-semibold text-lg">
              {summary.name} ({summary.dimensions})
            </h3>
            <div className="mt-2 space-y-1">
              <p className="text-gray-600">
                Possible units to produce: {' '}
                <span className="font-medium text-gray-900">
                  {summary.possibleUnits}
                </span>
              </p>
              {summary.possibleUnits === 0 && (
                <div className="flex items-center text-red-600 text-sm mt-1">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Production blocked due to material shortage
                </div>
              )}
              {summary.limitingMaterials.length > 0 && (
                <p className="text-sm text-gray-500">
                  Limited by: {summary.limitingMaterials.join(', ')}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};