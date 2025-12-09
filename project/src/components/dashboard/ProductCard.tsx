import React from 'react';
import { Product } from '../../types';
import { Bed } from 'lucide-react';

interface ProductCardProps {
  product: Product; 
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:scale-105">
      <div className="p-4">
        <div className="flex items-center justify-center h-32 sm:h-48 bg-gray-50 rounded-lg mb-4">
          <Bed className="w-24 h-24 sm:w-32 sm:h-32 text-indigo-600" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold mb-2 line-clamp-2">{product.name}</h3>
        
        <div className="border-t pt-2">
          <p className="text-base sm:text-lg font-semibold text-indigo-600">₹{product.productionCostTotal}</p>
          <div className="mt-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Available to Produce:</span>
              <span className="font-medium">{product.maxProduce} units</span>
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 py-3 bg-gray-50">
        <div className="text-sm text-gray-600">
          <strong>Production Cost Breakdown:</strong>
          <div className="mt-1 max-h-24 overflow-y-auto pr-2 space-y-1">
            {Object.entries(product.productionCostBreakdown).map(([material, cost]) => (
              <div key={material} className="flex justify-between text-xs sm:text-sm">
                <span className="truncate mr-2">{material}:</span>
                <span className="font-medium">₹{cost}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};