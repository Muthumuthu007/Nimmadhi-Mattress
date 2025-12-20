import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { ProductionResponse, InsufficientMaterial } from '../types/index';

import { productionApi } from '../utils/productionApi';

import { AlertTriangle, RotateCcw, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import UndoProductionModal from './UndoProductionModal';

interface ProductionFormProps {
  products: Product[];
  onProductionComplete: () => void;
}

export const ProductionForm: React.FC<ProductionFormProps> = ({
  products,
  onProductionComplete
}) => {
  const { user } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insufficientMaterials, setInsufficientMaterials] = useState<InsufficientMaterial[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastProduction, setLastProduction] = useState<ProductionResponse | null>(null);
  const [isUndoModalOpen, setIsUndoModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedProduction = localStorage.getItem('lastProduction');
    if (savedProduction) {
      try {
        setLastProduction(JSON.parse(savedProduction));
      } catch (e) {
        console.error('Failed to parse saved production data', e);
        localStorage.removeItem('lastProduction');
      }
    }
  }, []);

  useEffect(() => {
    if (lastProduction) {
      localStorage.setItem('lastProduction', JSON.stringify(lastProduction));
    } else {
      localStorage.removeItem('lastProduction');
    }
  }, [lastProduction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    if (!quantity || isNaN(Number(quantity)) || Number(quantity) < 1) {
      setError('Please enter a valid quantity.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setInsufficientMaterials([]);

    try {
      if (!selectedProductDetails) {
        setError('Selected product details not found.');
        setIsLoading(false);
        return;
      }

      const newTotalCostPerUnit = (
        Number(selectedProductDetails.productionCostTotal) +
        Number(selectedProductDetails.laborCost || 0) +
        Number(selectedProductDetails.transportCost || 0) +
        Number(selectedProductDetails.wastageAmount || 0) +
        Number((selectedProductDetails as any).otherCost || 0)
      );
      const response = await productionApi.push({
        product_id: selectedProduct,
        quantity: Number(quantity),
        username: user.username,
        production_cost_per_unit: newTotalCostPerUnit
      });

      const data = response.data;
      console.log('Production push response data:', data);
      console.log('data.total_cost:', data.total_cost);
      console.log('data["total_cost"]:', data['total_cost']);
      console.log('data.total_production_cost:', data.total_production_cost);

      if (data && (data.message === "Production successful" ||
        data.message?.includes("successfully") ||
        (data as any).status === "success")) {

        setLastProduction(data);
        // Robustly check for total_cost using multiple access methods and fallbacks
        const finalCost = data.total_cost ?? data['total_cost'] ?? data.total_production_cost ?? 0;
        console.log('finalCost selected:', finalCost);
        setSuccessMessage(`Successfully produced ${data.quantity_produced} units at a total cost of ₹${Number(finalCost).toFixed(2)}`);
        onProductionComplete();
      } else if (data && data.can_produce === false && data.insufficient_materials) {
        setError(data.reason || 'Insufficient stock to complete production.');
        setInsufficientMaterials(data.insufficient_materials);
      } else {
        setError(data?.message || 'Production failed. Please try again.');
      }
    } catch (error: any) {
      const errorData = error?.response?.data;
      if (errorData && errorData.can_produce === false && errorData.insufficient_materials) {
        setError(errorData.reason || 'Insufficient stock to complete production.');
        setInsufficientMaterials(errorData.insufficient_materials);
      } else {
        setError(errorData?.message || 'Production failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to normalize strings for comparison
  const normalizeString = (str: string) => {
    return str
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' '); // Collapse multiple spaces into one
  };

  // Filter products based on search
  const filteredProducts = products.map(product => {
    return {
      ...product,
      maxProduce: product.maxProduce,
      missingMaterials: []
    };
  }).filter(product => {
    const normalizedQuery = normalizeString(searchQuery);
    const normalizedName = normalizeString(product.name || '');
    const normalizedId = normalizeString(product.id || '');

    return normalizedName.includes(normalizedQuery) || normalizedId.includes(normalizedQuery);
  });

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const rawSelectedProduct = products.find(p => p.id === selectedProduct);
  const selectedProductDetails = rawSelectedProduct ? {
    ...rawSelectedProduct,
    maxProduce: rawSelectedProduct.maxProduce
  } : undefined;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md transition-colors duration-300">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Start Production</h2>
        <button
          type="button"
          onClick={() => setIsUndoModalOpen(true)}
          className="flex items-center px-4 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors duration-200"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Undo Production
        </button>
      </div>

      {error && !insufficientMaterials.length && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md flex items-start">
          <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md">
          {successMessage}
        </div>
      )}

      {lastProduction && (() => {
        const lastProduct = products.find(p => p.id === lastProduction.product_id);
        return (
          <div className="mb-4 p-4 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-md transition-colors duration-300">
            <h3 className="font-medium text-indigo-800 dark:text-indigo-300 mb-2">Last Production Details</h3>
            <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <p><span className="font-medium">Product ID:</span> {lastProduction.product_id}</p>
              <p><span className="font-medium">Quantity:</span> {lastProduction.quantity_produced} units</p>
              <p><span className="font-medium">Cost per Unit:</span> ₹{lastProduct ? (
                Number(lastProduct.productionCostTotal) +
                Number(lastProduct.laborCost || 0) +
                Number(lastProduct.transportCost || 0) +
                Number(lastProduct.wastageAmount || 0) +
                Number((lastProduct as any).otherCost || 0)
              ).toFixed(2) : '-'}</p>
              <p><span className="font-medium">Total Cost:</span> ₹{(
                lastProduction.total_cost ??
                lastProduction.total_production_cost ??
                (lastProduct ? (
                  Number(lastProduct.productionCostTotal) +
                  Number(lastProduct.laborCost || 0) +
                  Number(lastProduct.transportCost || 0) +
                  Number(lastProduct.wastageAmount || 0) +
                  Number((lastProduct as any).otherCost || 0)
                ) * Number(lastProduction.quantity_produced) : 0)
              ).toFixed(2)}</p>
              <p><span className="font-medium">Push ID:</span> {lastProduction.push_id}</p>
            </div>
          </div>
        );
      })()}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Product</label>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              className="flex justify-between items-center w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-left text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span>
                {selectedProductDetails ? selectedProductDetails.name : 'Choose a product...'}
              </span>
              {isDropdownOpen ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {isDropdownOpen && (
              <div className="absolute z-10 mt-1 w-full rounded-md bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      className="pl-10 pr-4 py-2 w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300"
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search products"
                      title="Search products"
                    />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No products found
                    </div>
                  ) : (
                    filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700`
                        }
                        onClick={() => {
                          setSelectedProduct(product.id);
                          setIsDropdownOpen(false);
                          setSearchQuery('');
                        }}
                        disabled={false}
                      >
                        <div className="flex justify-between items-center">
                          <span>{product.name}</span>

                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedProductDetails && (
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md transition-colors duration-300">
            <h3 className="font-medium text-gray-700 dark:text-gray-200 mb-2">Product Details</h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <p className="flex justify-between">
                <span>Available to Produce:</span>
                <span className="font-medium">{selectedProductDetails.maxProduce} units</span>
              </p>
              <p className="flex justify-between">
                <span>Cost per Unit:</span>
                <span className="font-medium">₹{(
                  Number(selectedProductDetails.productionCostTotal) +
                  Number(selectedProductDetails.laborCost || 0) +
                  Number(selectedProductDetails.transportCost || 0) +
                  Number(selectedProductDetails.wastageAmount || 0) +
                  Number((selectedProductDetails as any).otherCost || 0)
                ).toFixed(2)}</span>
              </p>
              <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                <p className="text-gray-600 dark:text-gray-400 mb-1">Materials Required per Unit:</p>
                <ul className="list-disc list-inside">
                  {Object.entries(selectedProductDetails.stockNeeded).map(([material, quantity]) => (
                    <li key={material}>
                      {material}: {quantity} units
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
          <input
            type="text"
            min="1"
            max={selectedProductDetails?.maxProduce || 1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>

        {selectedProductDetails && (
          <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-md transition-colors duration-300">
            <h3 className="font-medium text-indigo-700 dark:text-indigo-300 mb-2">Production Summary</h3>
            <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <p className="flex justify-between">
                <span>Total Cost:</span>
                <span className="font-medium">₹{(
                  (Number(selectedProductDetails.productionCostTotal) +
                    Number(selectedProductDetails.laborCost || 0) +
                    Number(selectedProductDetails.transportCost || 0) +
                    Number(selectedProductDetails.wastageAmount || 0) +
                    Number((selectedProductDetails as any).otherCost || 0)) * Number(quantity)
                ).toFixed(2)}</span>
              </p>
              <p className="flex justify-between">
                <span>Total Materials Required:</span>
                <span className="font-medium">
                  {Object.entries(selectedProductDetails.stockNeeded)
                    .map(([material, qty]) => `${material}: ${Number(qty) * Number(quantity)}`)
                    .join(', ')}
                </span>
              </p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !selectedProduct || Number(quantity) < 1}
          className={`w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${(isLoading || !selectedProduct || Number(quantity) < 1)
            ? 'opacity-50 cursor-not-allowed'
            : ''
            }`}
        >
          {isLoading ? 'Processing...' : 'Start Production'}
        </button>
      </form>

      {error && insufficientMaterials.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">Insufficient Materials Details:</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-red-100 dark:bg-red-900/40 font-medium text-red-900 dark:text-red-100">
                <tr>
                  <th className="px-3 py-2">Material</th>
                  <th className="px-3 py-2">Required</th>
                  <th className="px-3 py-2">Available</th>
                  <th className="px-3 py-2">Shortage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-200 dark:divide-red-800">
                {insufficientMaterials.map((item, index) => (
                  <tr key={index} className="text-red-800 dark:text-red-200">
                    <td className="px-3 py-2">{item.material_name}</td>
                    <td className="px-3 py-2">{item.required_per_unit}</td>
                    <td className="px-3 py-2">{item.available_stock}</td>
                    <td className="px-3 py-2 font-bold">{item.shortage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <UndoProductionModal
        isOpen={isUndoModalOpen}
        onClose={() => setIsUndoModalOpen(false)}
        onUndoSuccess={() => {
          setSuccessMessage('Production undone successfully');
          onProductionComplete();
        }}
      />
    </div>
  );
};