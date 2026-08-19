import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { ProductionForm } from '../components/ProductionForm';
import DeleteConfirmationDialog from '../components/DeleteConfirmationDialog';
import { AlterMaterialsModal } from '../components/AlterMaterialsModal';
import { useProducts } from '../contexts/ProductContext';
import { useInventory } from '../hooks/useInventory';
import { Package2, RefreshCw, Loader2, Search, Trash2, AlertCircle, ArrowUpDown, Settings, Download, ChevronDown, ChevronRight, ChevronsDown, ChevronsUp, ArrowUp, Layers, FolderPlus } from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { productionApi, productGroupApi } from '../utils/productionApi';
import { ProductionListSkeleton } from '../components/skeletons/ProductionListSkeleton';
import { useSubstringSearch } from '../hooks/useSubstringSearch';
import { HighlightText } from '../utils/searchUtils';
import { ProductionExcelUpload } from '../components/ProductionExcelUpload';
import { NewProductGroupForm } from '../components/NewProductGroupForm';
import { Product } from '../types';
import { WithMatches } from '../hooks/useFuzzySearch';
import { formatApiDate, toTimestamp } from '../utils/dateUtils';

// Module-level constant so the search memo isn't invalidated every render.
const PRODUCT_SEARCH_KEYS = ['name', 'id'];

// Stable key used for products the API returns with a null group.
const UNGROUPED_GROUP_KEY = '__ungrouped__';

// Pure comparator factory — kept outside the component so it isn't
// recreated on every render; only depends on the current sort settings.
const makeProductComparator = (sortField: string, sortDirection: 'asc' | 'desc') => {
  return (a: Product, b: Product) => {
    let comparison = 0;

    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'maxProduce':
        comparison = a.maxProduce - b.maxProduce;
        break;
      case 'cost':
        comparison = a.productionCostTotal - b.productionCostTotal;
        break;
      case 'totalCost':
        comparison = a.totalCost - b.totalCost;
        break;
      case 'laborCost':
        comparison = (a.laborCost || 0) - (b.laborCost || 0);
        break;
      case 'wastage':
        comparison = (a.wastage || 0) - (b.wastage || 0);
        break;
      case 'date':
        comparison = toTimestamp(a.createdAt) - toTimestamp(b.createdAt);
        break;
      default:
        comparison = 0;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  };
};

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-8 right-8 p-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-full shadow-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all duration-300 z-50 animate-bounce"
      aria-label="Scroll to top"
    >
      <ArrowUp className="h-6 w-6" />
    </button>
  );
};

interface ProductCardProps {
  product: WithMatches<Product>;
  query: string;
  isExpanded: boolean;
  isDeleting: boolean;
  onToggleExpand: (productId: string) => void;
  onAlterMaterials: (product: Product) => void;
  onDeleteClick: (productId: string) => void;
}

// Extracted + memoized so a product card only re-renders when its own
// props change (e.g. expand/collapse, delete-in-progress) rather than
// whenever any unrelated state in the page changes.
const ProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  query,
  isExpanded,
  isDeleting,
  onToggleExpand,
  onAlterMaterials,
  onDeleteClick,
}) => {
  return (
    <div
      className={`border-2 rounded-2xl p-4 md:p-6 transition-all duration-300 ${isExpanded
        ? 'border-indigo-400 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 shadow-xl'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-lg'
        }`}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
        <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
          <button
            onClick={() => onToggleExpand(product.id)}
            className={`flex-shrink-0 p-2 rounded-xl transition-all duration-200 ${isExpanded
              ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
              : 'bg-gray-100 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-600 dark:text-gray-300'
              }`}
            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            {isExpanded ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            {/* Updated with HighlightText */}
            <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white break-words">
              <HighlightText text={product.name} highlight={query} matches={product.matches} />
            </h3>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
              {/* Updated with HighlightText */}
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 break-all">ID: <span className="font-mono font-medium">
                <HighlightText text={product.id} highlight={query} matches={product.matches} />
              </span></p>
              <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">•</span>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{formatApiDate(product.createdAt, 'PPp')}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:flex-initial text-left sm:text-right">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Total Cost</div>
            <div className="text-lg sm:text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              ₹{Number(product.totalCost || (
                Number(product.productionCostTotal) +
                Number(product.laborCost || 0) +
                Number(product.transportCost || 0) +
                Number(product.wastageAmount || 0) +
                Number((product as any).otherCost || 0)
              )).toFixed(2)}
            </div>
          </div>
          <button
            onClick={() => onAlterMaterials(product)}
            className="flex-shrink-0 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 p-2 sm:p-3 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all duration-200 shadow-sm hover:shadow-md"
            title="Alter Materials"
          >
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            onClick={() => onDeleteClick(product.id)}
            disabled={isDeleting}
            className={`flex-shrink-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-2 sm:p-3 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200 shadow-sm hover:shadow-md ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            title="Delete Product"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </button>
        </div>
      </div>
      {isExpanded && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl p-3 md:p-4 border border-indigo-200 dark:border-indigo-800">
              <div className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-3 flex items-center">
                <Package2 className="h-4 w-4 mr-2" />
                Production Status
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs sm:text-sm gap-2">
                  <span className="text-indigo-700 dark:text-indigo-400">Max Produce:</span>
                  <span className="font-bold text-indigo-900 dark:text-indigo-200 text-right">{product.maxProduce} units</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm gap-2">
                  <span className="text-indigo-700 dark:text-indigo-400">Original Max:</span>
                  <span className="font-bold text-indigo-900 dark:text-indigo-200 text-right">{product.originalMaxProduce} units</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm gap-2">
                  <span className="text-indigo-700 dark:text-indigo-400">Wastage:</span>
                  <span className="font-bold text-indigo-900 dark:text-indigo-200 text-right">{product.wastage}% (₹{Number(product.wastageAmount || 0).toFixed(2)})</span>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-3 md:p-4 border border-purple-200 dark:border-purple-800">
              <div className="text-sm font-bold text-purple-900 dark:text-purple-300 mb-3">Cost Breakdown</div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs sm:text-sm gap-2">
                  <span className="text-purple-700 dark:text-purple-400 break-words">Labor Cost (per unit):</span>
                  <span className="font-bold text-purple-900 dark:text-purple-200 text-right flex-shrink-0">₹{Number(product.laborCost).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm gap-2">
                  <span className="text-purple-700 dark:text-purple-400 break-words">Transport Cost (per unit):</span>
                  <span className="font-bold text-purple-900 dark:text-purple-200 text-right flex-shrink-0">₹{Number((product as any).transportCost ?? (product as any)["transport_cost"] ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm gap-2">
                  <span className="text-purple-700 dark:text-purple-400 break-words">Production Cost:</span>
                  <span className="font-bold text-purple-900 dark:text-purple-200 text-right flex-shrink-0">₹{Number(product.productionCostTotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm pt-2 border-t border-purple-300 dark:border-purple-700 gap-2">
                  <span className="text-purple-700 dark:text-purple-400 font-bold break-words">Total Cost:</span>
                  <span className="font-bold text-purple-900 dark:text-purple-200 text-right flex-shrink-0">₹{Number(product.totalCost || (
                    Number(product.productionCostTotal) +
                    Number(product.laborCost || 0) +
                    Number(product.transportCost || 0) +
                    Number(product.wastageAmount || 0) +
                    Number((product as any).otherCost || 0)
                  )).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4 transition-colors duration-300">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Materials Required</div>
            <div className="space-y-2">
              {Object.entries(product.stockNeeded ?? {}).map(([material, quantity]) => (
                <div key={material} className="flex justify-between items-start gap-2 text-gray-900 dark:text-gray-200">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs sm:text-sm font-medium break-words">{material}</span>
                    {product.groupChain[material] && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 break-words">({product.groupChain[material]})</span>
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-medium flex-shrink-0 text-right">{String(quantity)} units</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Production Cost Breakdown</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-900 dark:text-gray-200">
              {Object.entries(product.productionCostBreakdown ?? {}).map(([material, cost]) => (
                <div key={material} className="flex justify-between gap-2">
                  <span className="break-words">{material}:</span>
                  <span className="font-medium flex-shrink-0 text-right">₹{Number(cost).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
});
ProductCard.displayName = 'ProductCard';

const Production = () => {
  const location = useLocation();
  const { products, groupedProducts, fetchProducts, addProduct } = useProducts();
  const { refreshInventory } = useInventory();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Removed local searchQuery state in favor of hook
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [showAlterMaterialsModal, setShowAlterMaterialsModal] = useState(false);
  const [selectedProductForAlter, setSelectedProductForAlter] = useState<any>(null);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [showCreateGroupForm, setShowCreateGroupForm] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<{ id: string; name: string; productCount: number } | null>(null);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  // Tracks which group sections the user has opened (by group_id or
  // '__ungrouped__'). Default: empty set, so every group starts collapsed
  // and the user opens only the group they want to look at.
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroupExpand = useCallback((groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }, []);

  // Case-insensitive substring search over the flat product list. Produces
  // exact match ranges used both to decide which products are visible and to
  // highlight only the matched substring.
  const { query, setQuery, filteredData: filteredProducts } = useSubstringSearch(products, PRODUCT_SEARCH_KEYS);

  const isSearching = query.trim().length > 0;

  // ── Fetch function ─────────────────────────────────────────────────────
  const fetchProductionList = useCallback(async () => {
    await fetchProducts();
  }, [fetchProducts]);

  // O(1) lookup: product id -> matched product (carrying exact match ranges)
  const matchedProductById = useMemo(() => {
    const map = new Map<string, WithMatches<Product>>();
    filteredProducts.forEach(p => map.set(p.id, p));
    return map;
  }, [filteredProducts]);

  // Build the grouped sections actually rendered on screen:
  // - source of truth is grouped_products from ProductionListResponse via context
  // - each section's products are filtered down to the current search matches
  // - each section's products are sorted using the existing sort controls
  // - while searching, a section with zero matches is dropped (it can never
  //   satisfy the search)
  // - otherwise, every group is shown even with zero products, so a newly
  //   created group (e.g. via "Create Group") stays visible until products
  //   are moved into it
  // groupKey is resolved once here so the rest of the component never has to
  // repeat the null-group fallback.
  const displaySections = useMemo(() => {
    const comparator = makeProductComparator(sortField, sortDirection);

    return groupedProducts
      .map(section => {
        const visibleProducts = section.products
          .filter(p => matchedProductById.has(p.id))
          .map(p => matchedProductById.get(p.id)!)
          .sort(comparator);

        return {
          ...section,
          groupKey: section.groupId ?? UNGROUPED_GROUP_KEY,
          products: visibleProducts,
        };
      })
      .filter(section => !isSearching || section.products.length > 0);
  }, [groupedProducts, matchedProductById, sortField, sortDirection, isSearching]);

  const totalVisibleProducts = useMemo(
    () => displaySections.reduce((sum, section) => sum + section.products.length, 0),
    [displaySections]
  );

  // While a search is active every rendered group is force-opened, so matching
  // products are visible without manual clicks. The user's own choices stay
  // untouched in `expandedGroups`, so clearing the search restores them exactly.
  const isGroupOpen = useCallback(
    (groupKey: string) => isSearching || expandedGroups.has(groupKey),
    [isSearching, expandedGroups]
  );

  // Drives the label/icon of the expand-all / collapse-all control. Based on
  // the user's own state (the control is hidden while searching).
  const areAllGroupsExpanded = useMemo(
    () =>
      displaySections.length > 0 &&
      displaySections.every(section => expandedGroups.has(section.groupKey)),
    [displaySections, expandedGroups]
  );

  const toggleAllGroups = useCallback(() => {
    setExpandedGroups(
      areAllGroupsExpanded
        ? new Set()
        : new Set(displaySections.map(section => section.groupKey))
    );
  }, [areAllGroupsExpanded, displaySections]);

  useEffect(() => {
    setIsLoading(true);
    fetchProductionList()
      .catch(() => setError('Failed to load products.'))
      .finally(() => setIsLoading(false));
  }, [location.pathname, fetchProductionList]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await fetchProductionList();
      setSuccessMessage('Products refreshed successfully!');
    } catch {
      setError('Failed to refresh products.');
    }
    setIsRefreshing(false);
  };

  const handleCreateGroupSuccess = async (groupName: string) => {
    setError(null);
    setSuccessMessage(`Group "${groupName}" created successfully!`);
    // Re-fetch so the new (empty) group is reflected in grouped_products.
    await fetchProductionList();
  };

  const handleConfirmDeleteGroup = async () => {
    if (!groupToDelete) return;
    // Defense in depth: the confirm button is already disabled while the
    // group has products, but never send the request if that's somehow true.
    if (groupToDelete.productCount > 0) return;

    setIsDeletingGroup(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await productGroupApi.deleteGroup(groupToDelete.id);
      const deletedName = response.data?.name || groupToDelete.name;
      setSuccessMessage(`Group "${deletedName}" deleted successfully!`);
      await fetchProductionList();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete group. Please try again.');
    } finally {
      setIsDeletingGroup(false);
      setGroupToDelete(null);
    }
  };

  const handleProductionComplete = async () => {
    await refreshInventory();
    await fetchProductionList();
  };

  const handleDeleteClick = useCallback((productId: string) => {
    setProductToDelete(productId);
    setShowDeleteDialog(true);
  }, []);

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    setIsDeletingProduct(productToDelete);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await productionApi.deleteProduct(productToDelete);

      if (response.data && response.data.message && response.data.message.includes('deleted successfully')) {
        setSuccessMessage(`Product deleted successfully`);
        fetchProductionList();
      } else {
        setError(response.data.message || 'Failed to delete product. Please try again.');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message || 'Failed to delete product. Please try again.');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsDeletingProduct(null);
      setShowDeleteDialog(false);
      setProductToDelete(null);
    }
  };

  const handleAlterMaterials = useCallback((product: any) => {
    setSelectedProductForAlter(product);
    setShowAlterMaterialsModal(true);
  }, []);

  const handleToggleExpand = useCallback((productId: string) => {
    setExpandedProductId(prev => (prev === productId ? null : productId));
  }, []);

  const handleAlterMaterialsSuccess = (updatedData?: any) => {
    if (updatedData && selectedProductForAlter) {
      const updatedProduct = {
        ...selectedProductForAlter,
        stockNeeded: updatedData.stock_needed || selectedProductForAlter.stockNeeded,
        materials: updatedData.stock_needed
          ? Object.entries(updatedData.stock_needed).map(([k, v]) => ({ materialName: k, quantity: Number(v) }))
          : selectedProductForAlter.materials,
        productionCostTotal: updatedData.production_cost_total ?? selectedProductForAlter.productionCostTotal,
        wastageAmount: updatedData.wastage_amount ?? selectedProductForAlter.wastageAmount,
        totalCost: updatedData.total_cost ?? selectedProductForAlter.totalCost,
        maxProduce: updatedData.max_produce ?? selectedProductForAlter.maxProduce,
        inventory: updatedData.inventory ?? selectedProductForAlter.inventory,
      };

      addProduct(updatedProduct);
    }

    // Refresh the products list to get updated data
    fetchProductionList();
    setSuccessMessage('Product materials updated successfully!');
  };

  const handleAlterMaterialsClose = () => {
    setShowAlterMaterialsModal(false);
    setSelectedProductForAlter(null);
  };

  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const handleDownloadExcel = () => {
    if (!products || products.length === 0) {
      alert('No products available to export');
      return;
    }

    try {
      const sheetData: any[][] = [];

      // Add header row
      sheetData.push(['PRODUCTION DETAILS REPORT']);
      sheetData.push(['Generated on:', new Date().toLocaleString()]);
      sheetData.push(['Total Products:', products.length]);
      sheetData.push([]); // Empty row

      products.forEach((product, index) => {
        // Product header row with styling
        sheetData.push([
          `PRODUCT ${index + 1}: ${product.name}`,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        sheetData.push([
          'Product ID:',
          product.id,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        sheetData.push([
          'Created At:',
          product.createdAt ? (typeof product.createdAt === 'string' ? product.createdAt : new Date(product.createdAt).toLocaleString()) : 'N/A',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        sheetData.push([]); // Empty row

        // Production Details Header
        sheetData.push([
          'PRODUCTION DETAILS',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        sheetData.push([
          'Max Produce (units)',
          'Original Max (units)',
          'Wastage (%)',
          'Wastage Amount (₹)',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        sheetData.push([
          product.maxProduce || 0,
          product.originalMaxProduce || 0,
          product.wastage || 0,
          Number(product.wastageAmount || 0).toFixed(2),
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        sheetData.push([]); // Empty row

        // Cost Details Header
        sheetData.push([
          'COST BREAKDOWN',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        sheetData.push([
          'Labor Cost (₹)',
          'Transport Cost (₹)',
          'Production Cost (₹)',
          'Other Cost (₹)',
          'Total Cost (₹)',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        const totalCost =
          Number(product.productionCostTotal || 0) +
          Number(product.laborCost || 0) +
          Number((product as any).transportCost ?? (product as any)["transport_cost"] ?? 0) +
          Number(product.wastageAmount || 0) +
          Number((product as any).otherCost || 0);

        sheetData.push([
          Number(product.laborCost || 0).toFixed(2),
          Number((product as any).transportCost ?? (product as any)["transport_cost"] ?? 0).toFixed(2),
          Number(product.productionCostTotal || 0).toFixed(2),
          Number((product as any).otherCost || 0).toFixed(2),
          totalCost.toFixed(2),
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        sheetData.push([]); // Empty row

        // Materials Required
        sheetData.push([
          'MATERIALS REQUIRED',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        sheetData.push([
          'Material Name',
          'Quantity (units)',
          'Group/Category',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        if (product.stockNeeded && Object.keys(product.stockNeeded).length > 0) {
          Object.entries(product.stockNeeded).forEach(([material, quantity]) => {
            sheetData.push([
              material,
              quantity,
              product.groupChain && product.groupChain[material] ? product.groupChain[material] : 'N/A',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              ''
            ]);
          });
        } else {
          sheetData.push([
            'No materials required',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            ''
          ]);
        }

        sheetData.push([]); // Empty row

        // Production Cost Breakdown by Material
        sheetData.push([
          'PRODUCTION COST BREAKDOWN BY MATERIAL',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        sheetData.push([
          'Material Name',
          'Cost (₹)',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        if (product.productionCostBreakdown && Object.keys(product.productionCostBreakdown).length > 0) {
          Object.entries(product.productionCostBreakdown).forEach(([material, cost]) => {
            sheetData.push([
              material,
              Number(cost).toFixed(2),
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              ''
            ]);
          });
        } else {
          sheetData.push([
            'No cost breakdown available',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            ''
          ]);
        }

        // Add separator between products
        sheetData.push([]);
        sheetData.push(['═══════════════════════════════════════════════════════════════════════════════════════════════']);
        sheetData.push([]);
      });

      // Create worksheet from data
      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      // Set column widths
      ws['!cols'] = [
        { wch: 35 }, // Column A - wider for labels
        { wch: 20 }, // Column B
        { wch: 20 }, // Column C
        { wch: 20 }, // Column D
        { wch: 20 }, // Column E
        { wch: 15 }, // Column F
        { wch: 15 }, // Column G
        { wch: 15 }, // Column H
        { wch: 15 }, // Column I
        { wch: 15 }, // Column J
        { wch: 15 }  // Column K
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Production Details');

      // Generate filename with timestamp
      const timestamp = formatApiDate(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const filename = `Production_Details_${timestamp}.xlsx`;

      // Write file
      XLSX.writeFile(wb, filename);

      setSuccessMessage(`Excel file "${filename}" downloaded successfully!`);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);

    } catch (error) {
      console.error('Error generating Excel file:', error);
      setError('Failed to generate Excel file. Please try again.');

      // Clear error message after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    }
  };

  if (isLoading || isRefreshing) {
    return <ProductionListSkeleton />;
  }



  return (
    <div className="space-y-6">
      {/* Header with enhanced gradient background */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 dark:from-purple-800 dark:via-indigo-800 dark:to-blue-800 rounded-2xl shadow-xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Production Management</h1>
            <p className="text-purple-100 dark:text-purple-200 text-sm md:text-base">Manage your products and production workflow</p>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto">
            <button
              onClick={handleDownloadExcel}
              className="flex items-center px-4 md:px-5 py-2.5 bg-white text-purple-600 dark:text-purple-700 rounded-xl font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 text-sm md:text-base whitespace-nowrap"
            >
              <Download className="h-5 w-5 mr-2" />
              Export Excel
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`flex items-center px-4 md:px-5 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-xl font-medium shadow-lg hover:bg-white/30 hover:shadow-xl hover:scale-105 transition-all duration-200 text-sm md:text-base whitespace-nowrap ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              {isRefreshing ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-5 w-5 mr-2" />
              )}
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={() => setShowCreateGroupForm(true)}
              className="flex items-center px-4 md:px-5 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-xl font-medium shadow-lg hover:bg-white/30 hover:shadow-xl hover:scale-105 transition-all duration-200 text-sm md:text-base whitespace-nowrap"
            >
              <FolderPlus className="h-5 w-5 mr-2" />
              Create Group
            </button>
            <ProductionExcelUpload onUploadComplete={handleRefresh} />
          </div>
        </div>
      </div>

      {/* Alert Messages with enhanced styling */}
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 p-5 rounded-xl shadow-md animate-in slide-in-from-top duration-300">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-5 rounded-xl shadow-md animate-in slide-in-from-top duration-300">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Sort Section with enhanced card design */}
      <div className="bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-900/20 rounded-2xl shadow-xl p-5 md:p-6 border-2 border-purple-200 dark:border-gray-700">
        <div className="flex flex-col gap-4">
          <div className="relative flex-grow w-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-purple-400 dark:text-purple-500" />
            </div>
            <input
              type="text"
              placeholder="Search products by name or ID..."
              className="pl-12 pr-4 py-3 w-full border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 transition-all duration-200 bg-white dark:bg-gray-700 hover:shadow-md text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300 shadow-sm"
              value={query} // Updated to use query from hook
              onChange={(e) => setQuery(e.target.value)} // Updated to use setQuery from hook
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sort by:</span>
            <div className="relative flex-1 min-w-[200px]">
              <select
                className="appearance-none w-full bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl py-3 pl-4 pr-12 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 transition-all duration-200 cursor-pointer hover:border-purple-300 dark:hover:border-purple-500 shadow-sm hover:shadow-md"
                value={sortField}
                onChange={(e) => handleSort(e.target.value)}
                aria-label="Sort products by"
              >
                <option value="name" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Product Name</option>
                <option value="maxProduce" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Max Produce</option>
                <option value="cost" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Production Cost</option>
                <option value="totalCost" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Total Cost</option>
                <option value="laborCost" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Labor Cost</option>
                <option value="wastage" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Wastage %</option>
                <option value="date" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Date Created</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                <ArrowUpDown className="h-4 w-4 text-purple-400 dark:text-purple-500" />
              </div>
            </div>

            <button
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-300 dark:hover:border-purple-500 transition-all duration-200 font-bold text-lg text-purple-600 dark:text-purple-400 shadow-sm hover:shadow-md hover:scale-110"
              title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
        <div className="lg:col-span-2 order-2 lg:order-1">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center">
                <Package2 className="h-5 w-5 md:h-6 md:w-6 mr-2 md:mr-3 text-indigo-600 dark:text-indigo-400" />
                Available Products
              </h2>
              <div className="flex items-center gap-2 md:gap-3">
                {/* Hidden while searching: results are auto-expanded, so the
                    control would have no visible effect. */}
                {!isSearching && displaySections.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAllGroups}
                    className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-xs md:text-sm font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-300 dark:hover:border-purple-500 shadow-sm hover:shadow-md transition-all duration-200 whitespace-nowrap"
                    title={areAllGroupsExpanded ? 'Collapse all groups' : 'Expand all groups'}
                  >
                    {areAllGroupsExpanded ? (
                      <ChevronsUp className="h-4 w-4" />
                    ) : (
                      <ChevronsDown className="h-4 w-4" />
                    )}
                    {areAllGroupsExpanded ? 'Collapse All' : 'Expand All'}
                  </button>
                )}
                <div className="bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 text-indigo-800 dark:text-indigo-300 px-3 md:px-4 py-1.5 md:py-2 rounded-xl shadow-sm text-xs md:text-sm font-bold whitespace-nowrap">
                  {isSearching
                    ? `${totalVisibleProducts} Result${totalVisibleProducts !== 1 ? 's' : ''}`
                    : `${products.length} Product${products.length !== 1 ? 's' : ''}`}
                </div>
              </div>
            </div>
            <div className="space-y-8">
              {displaySections.length > 0 ? (
                displaySections.map(section => {
                  const { groupKey } = section;
                  const isOpen = isGroupOpen(groupKey);
                  return (
                    <div key={groupKey}>
                      {/* Group section header — click to collapse/expand, plus a delete action */}
                      <div className="w-full flex items-center gap-2 mb-4 pb-2 border-b-2 border-gray-100 dark:border-gray-700 rounded-t-lg px-2 py-1 -mx-2">
                        <button
                          type="button"
                          onClick={() => toggleGroupExpand(groupKey)}
                          aria-expanded={isOpen}
                          className="flex-1 flex items-center gap-2 min-w-0 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg py-1 px-1 -mx-1 transition-colors duration-200"
                        >
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                          )}
                          <Layers className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                          <h3 className="text-sm md:text-base font-bold text-gray-700 dark:text-gray-200 truncate">
                            {section.groupName}
                          </h3>
                          <span className="flex-shrink-0 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold px-2 py-0.5 rounded-full">
                            {section.products.length}
                          </span>
                        </button>

                        {groupKey !== UNGROUPED_GROUP_KEY && (
                          <button
                            type="button"
                            onClick={() => setGroupToDelete({ id: groupKey, name: section.groupName, productCount: section.productCount })}
                            disabled={isDeletingGroup}
                            className="flex-shrink-0 p-1.5 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={`Delete group "${section.groupName}"`}
                            aria-label={`Delete group ${section.groupName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {isOpen && (
                        section.products.length > 0 ? (
                          <div className="space-y-6">
                            {section.products.map(product => (
                              <ProductCard
                                key={product.id}
                                product={product}
                                query={query}
                                isExpanded={expandedProductId === product.id}
                                isDeleting={isDeletingProduct === product.id}
                                onToggleExpand={handleToggleExpand}
                                onAlterMaterials={handleAlterMaterials}
                                onDeleteClick={handleDeleteClick}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-sm text-gray-400 dark:text-gray-500">
                            No products in this group yet
                          </div>
                        )
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center">
                  <div className="h-16 w-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    {isSearching ? (
                      <Search className="h-8 w-8 text-indigo-300 dark:text-indigo-500" />
                    ) : (
                      <Package2 className="h-8 w-8 text-indigo-300 dark:text-indigo-500" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    {isSearching ? 'No products found' : 'No products available'}
                  </h3>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    {isSearching
                      ? 'Try another product name or Product ID.'
                      : 'Products moved to production will appear here.'}
                  </p>
                  {isSearching && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="mt-4 text-sm font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <ProductionForm
            products={products}
            onProductionComplete={handleProductionComplete}
          />
        </div>
      </div>
      <ScrollToTop />

      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        isDeleting={Boolean(isDeletingProduct)}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteDialog(false);
          setProductToDelete(null);
        }}
      />

      {selectedProductForAlter && (
        <AlterMaterialsModal
          product={selectedProductForAlter}
          isOpen={showAlterMaterialsModal}
          onClose={handleAlterMaterialsClose}
          onSuccess={handleAlterMaterialsSuccess}
        />
      )}

      {showCreateGroupForm && (
        <NewProductGroupForm
          onClose={() => setShowCreateGroupForm(false)}
          onSuccess={handleCreateGroupSuccess}
        />
      )}

      <DeleteConfirmationDialog
        isOpen={!!groupToDelete}
        title="Delete Group"
        message={`Are you sure you want to delete the group "${groupToDelete?.name}"? This action cannot be undone.`}
        warning={
          groupToDelete && groupToDelete.productCount > 0
            ? `This group still has ${groupToDelete.productCount} product${groupToDelete.productCount !== 1 ? 's' : ''}. A group can only be deleted when it has zero products — move or remove them first.`
            : undefined
        }
        confirmDisabled={!!groupToDelete && groupToDelete.productCount > 0}
        isDeleting={isDeletingGroup}
        onConfirm={handleConfirmDeleteGroup}
        onCancel={() => setGroupToDelete(null)}
      />
    </div>
  );
};

export default Production;