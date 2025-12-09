import React, { memo, useMemo, useCallback, Suspense } from 'react';
import { format } from 'date-fns';

// Lazy-load heavy lucide icons
const X = React.lazy(() => import('lucide-react').then(m => ({ default: m.X })));
const Package = React.lazy(() => import('lucide-react').then(m => ({ default: m.Package })));
const DollarSign = React.lazy(() => import('lucide-react').then(m => ({ default: m.DollarSign })));
const Boxes = React.lazy(() => import('lucide-react').then(m => ({ default: m.Boxes })));
const ArrowUpRight = React.lazy(() => import('lucide-react').then(m => ({ default: m.ArrowUpRight })));
const ArrowDownRight = React.lazy(() => import('lucide-react').then(m => ({ default: m.ArrowDownRight })));
const AlertTriangle = React.lazy(() => import('lucide-react').then(m => ({ default: m.AlertTriangle })));

interface Props {
  product: any;
  onClose: () => void;
}

const ProductDetailsModalComponent = ({ product, onClose }: Props) => {

  const costBreakdown = useMemo(
    () => Object.entries(product.productionCostBreakdown || {}),
    [product.productionCostBreakdown]
  );

  const stockNeeded = useMemo(
    () => Object.entries(product.stockNeeded || {}),
    [product.stockNeeded]
  );

  const formatCurrency = useCallback((value: number) => {
    const v = Number(value);
    return isNaN(v) ? '0.00' : v.toFixed(2);
  }, []);

  const createdDate = useMemo(
    () => format(new Date(product.createdAt), 'PPp'),
    [product.createdAt]
  );

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-start justify-center z-50 overflow-y-auto">
      <div className="relative min-h-screen flex items-center justify-center py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full mx-4 will-change-transform">

          {/* HEADER */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 z-10">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold flex gap-2 text-gray-900 dark:text-white">
                  {product.name}
                  <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 text-sm font-medium rounded-full">
                    ID: {product.id}
                  </span>
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Created: {createdDate}</p>
              </div>

              <Suspense fallback={<div className="p-2">X</div>}>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                  <X className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                </button>
              </Suspense>
            </div>
          </div>

          <div className="p-6 space-y-6">

            {/* MAIN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* LEFT BLOCK */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  Production Details
                </h3>

                <div className="space-y-2">
                  <div className="p-3 bg-white dark:bg-gray-800 shadow-sm rounded-lg flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Max Produce</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{product.maxProduce} units</span>
                  </div>

                  <div className="p-3 bg-white dark:bg-gray-800 shadow-sm rounded-lg flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Inventory</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{product.inventory ?? 0} units</span>
                  </div>
                </div>
              </div>

              {/* RIGHT BLOCK */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  Cost Summary
                </h3>

                <div className="space-y-2">
                  <div className="p-3 bg-white dark:bg-gray-800 shadow-sm rounded-lg flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Production Cost</span>
                    <span className="font-semibold text-gray-900 dark:text-white">₹{formatCurrency(product.productionCostTotal)}</span>
                  </div>

                  <div className="p-3 bg-white dark:bg-gray-800 shadow-sm rounded-lg flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Labour Cost</span>
                    <span className="font-semibold text-gray-900 dark:text-white">₹{formatCurrency(product.laborCost)}</span>
                  </div>

                  <div className="p-3 bg-white dark:bg-gray-800 shadow-sm rounded-lg flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">Total Cost</span>
                    <span className="font-bold text-green-700 dark:text-green-400">₹{formatCurrency(product.totalCost)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* BREAKDOWN */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white">Material Cost Breakdown</h3>
              <div className="max-h-[300px] overflow-y-auto mt-4 space-y-2 scrollbar-thin">
                {costBreakdown.map(([material, cost]) => (
                  <div key={material} className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex justify-between">
                    <span className="text-gray-700 dark:text-gray-300">{material}</span>
                    <span className="font-medium text-gray-900 dark:text-white">₹{formatCurrency(cost)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* MATERIALS */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white">Required Materials</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto scrollbar-thin mt-4">
                {stockNeeded.map(([item, qty]) => (
                  <div key={item} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                    <h4 className="font-medium mb-2 text-gray-900 dark:text-white">{item}</h4>
                    <div className="flex justify-between">
                      <span className="text-gray-700 dark:text-gray-300">Required:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{qty} units</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* FOOTER */}
          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700/50 px-6 py-4 border-t border-gray-200 dark:border-gray-700 rounded-b-xl flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-lg transition-colors">
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export const ProductDetailsModal = memo(ProductDetailsModalComponent);
