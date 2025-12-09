import { memo, useMemo } from 'react';
import { format } from 'date-fns';
import { Product } from '../../types';
import { ChevronRight, Package, AlertTriangle, DollarSign, TrendingUp, Truck } from 'lucide-react';

interface DashboardProductCardProps {
  product: Product;
  onViewDetails: (product: Product) => void;
}

export const DashboardProductCard = memo(({ product, onViewDetails }: DashboardProductCardProps) => {

  // Parse breakdown to array for rendering
  const materialCosts = useMemo(() => {
    return Object.entries(product.productionCostBreakdown || {})
      .map(([name, cost]) => ({ name, cost: Number(cost) }))
      .sort((a, b) => b.cost - a.cost); // Sort by cost descending
  }, [product.productionCostBreakdown]);

  const formatCurrency = (val: number | string | undefined) => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all duration-300 h-full flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-700 flex justify-between items-start bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-800">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight mb-1 truncate max-w-[200px]" title={product.name}>{product.name}</h3>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300 font-mono">ID: {product.id.slice(0, 8)}...</span>
            <span>{format(new Date(product.createdAt), 'MMM d, yyyy')}</span>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${product.maxProduce > 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
          {product.maxProduce > 0 ? 'In Stock' : 'Out of Stock'}
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-4 min-h-0">

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="bg-indigo-50/50 dark:bg-indigo-900/20 rounded-lg p-3 border border-indigo-100 dark:border-indigo-800">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 uppercase tracking-wide">Max Produce</span>
            </div>
            <p className="text-xl font-bold text-indigo-700 dark:text-indigo-400">{product.maxProduce.toLocaleString()}</p>
          </div>
          <div className="bg-emerald-50/50 dark:bg-emerald-900/20 rounded-lg p-3 border border-emerald-100 dark:border-emerald-800">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-300 uppercase tracking-wide">Total Cost</span>
            </div>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(product.totalCost)}</p>
          </div>
        </div>

        {/* Cost Breakdown Section */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Cost Breakdown
            </h4>
            <span className="text-xs text-gray-400 dark:text-gray-500">{materialCosts.length} items</span>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600 flex-1 overflow-hidden flex flex-col">
            {/* Summary Header */}
            <div className="grid grid-cols-2 gap-px bg-gray-200 dark:bg-gray-600 border-b border-gray-200 dark:border-gray-600 shrink-0">
              <div className="bg-white dark:bg-gray-800 p-2">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 block">Production</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(product.productionCostTotal)}</span>
              </div>
              <div className="bg-white dark:bg-gray-800 p-2">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 block">Labour</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(product.laborCost)}</span>
              </div>
            </div>

            {/* Scrollable Material List */}
            <div className="overflow-y-auto flex-1 p-2 space-y-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-600">
              {materialCosts.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs group hover:bg-white dark:hover:bg-gray-600 hover:shadow-sm rounded px-2 py-1 transition-all">
                  <span className="text-gray-600 dark:text-gray-300 truncate max-w-[160px]" title={item.name}>{item.name}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(item.cost)}</span>
                </div>
              ))}
              {materialCosts.length === 0 && (
                <div className="text-center py-4 text-xs text-gray-400 dark:text-gray-500 italic">No breakdown available</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Action */}
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 shrink-0">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="flex items-center gap-3 bg-amber-50/80 dark:bg-amber-900/20 px-3 py-2 rounded-lg border border-amber-100/50 dark:border-amber-800">
            <div className="bg-white dark:bg-gray-800 p-1.5 rounded-full shadow-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider block mb-0.5">Wastage</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(product.wastageAmount)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-blue-50/80 dark:bg-blue-900/20 px-3 py-2 rounded-lg border border-blue-100/50 dark:border-blue-800">
            <div className="bg-white dark:bg-gray-800 p-1.5 rounded-full shadow-sm">
              <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <span className="text-[10px] text-blue-700 dark:text-blue-400 font-bold uppercase tracking-wider block mb-0.5">Transport</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(product.transportCost)}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => onViewDetails(product)}
          className="w-full flex justify-center items-center gap-2 text-sm font-semibold text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 active:bg-indigo-800 py-2.5 rounded-lg transition-all shadow-sm hover:shadow"
        >
          View Details <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

DashboardProductCard.displayName = 'DashboardProductCard';
