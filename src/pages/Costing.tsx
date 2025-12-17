import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Search, Loader2, X, ChevronDown, ChevronUp, Filter, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createCastingProduct, CreateCastingPayload, viewCastings, CastingProductResponse, moveToProduction, MoveToProductionPayload, deleteCastingProduct, DeleteCastingPayload } from '../utils/castingApi';
import { apiClient } from '../utils/api';
import { RawMaterial } from '../types';
import { CostingSkeleton } from '../components/skeletons/CostingSkeleton';

interface SelectedIngredient {
  itemId: string;
  name: string;
  stockAvailable: number;
  unitCost: number;
  qtyUsed: number | string;
  subtotal: number;
}

// Format Currency safely guards against undefined/NaN values
const formatMoney = (amount: number | undefined | null) => {
  const numericValue = typeof amount === 'number' ? amount : Number(amount ?? 0);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
  return `₹${safeValue.toFixed(2)}`;
};

// CostingCard Component
interface CostingCardProps {
  product: CastingProductResponse;
  onMove: (productId: string) => void;
  onDelete: (productId: string) => void;
  isMoving?: boolean;
  isDeleting?: boolean;
}

const CostingCard: React.FC<CostingCardProps> = ({ product, onMove, onDelete, isMoving = false, isDeleting = false }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col transition-colors">
      {/* Header */}
      <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg text-gray-800 dark:text-white">{product.product_name}</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Created: {new Date(product.created_at).toLocaleDateString()}
          </span>
        </div>
        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-1 rounded-full">Draft</span>
      </div>

      {/* Body */}
      <div className="p-4 flex-grow">
        {/* Section A: Stock Recipe */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">Stock Composition</p>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded text-sm">
            {Object.entries(product.stock_needed).map(([key, value]) => (
              <div key={key} className="flex justify-between border-b border-gray-200 dark:border-gray-600 last:border-0 py-1">
                <span className="text-gray-600 dark:text-gray-300">{key}</span>
                <span className="font-medium text-gray-800 dark:text-white">Qty: {value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section B: Cost Breakdown */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">Cost Analysis</p>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex justify-between">
              <span>Labour:</span> <span>{formatMoney(product.labour_cost)}</span>
            </div>
            <div className="flex justify-between">
              <span>Transport:</span> <span>{formatMoney(product.transport_cost)}</span>
            </div>
            <div className="flex justify-between">
              <span>Other:</span> <span>{formatMoney(product.other_cost)}</span>
            </div>
            <div className="flex justify-between text-red-500 dark:text-red-400">
              <span>Wastage ({product.wastage_percent}%):</span>
              <span>{formatMoney(product.wastage_amount)}</span>
            </div>
          </div>
        </div>

        {/* Total Cost Highlight */}
        <div className="mt-2 pt-2 border-t border-dashed border-gray-300 dark:border-gray-600 flex justify-between items-center">
          <span className="font-bold text-gray-600 dark:text-gray-300">Total Est. Cost</span>
          <span className="text-xl font-bold text-green-600 dark:text-green-400">{formatMoney(product.total_cost)}</span>
        </div>
      </div>

      {/* Footer: Actions */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600 flex gap-2">
        <button
          onClick={() => onMove(product.product_id)}
          disabled={isMoving}
          className={`flex-1 bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 text-white text-sm font-medium py-2 px-4 rounded transition-colors shadow-sm flex items-center justify-center ${isMoving ? 'opacity-75 cursor-not-allowed' : ''
            }`}
        >
          {isMoving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Moving...
            </>
          ) : (
            'Move to Production'
          )}
        </button>
        <button
          onClick={() => onDelete(product.product_id)}
          disabled={isDeleting}
          className={`flex-1 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border border-gray-300 dark:border-gray-600 text-sm font-medium py-2 px-3 rounded transition-colors flex items-center justify-center ${isDeleting ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          title="Delete Draft"
        >
          {isDeleting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Deleting...
            </>
          ) : (
            'Delete'
          )}
        </button>
      </div>
    </div>
  );
};

const Costing: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [castings, setCastings] = useState<CastingProductResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWorkbench, setShowWorkbench] = useState(false);
  const [availableMaterials, setAvailableMaterials] = useState<RawMaterial[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'name' | 'id' | 'cost' | 'all'>('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [castingName, setCastingName] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([]);
  const [wastagePercent, setWastagePercent] = useState('');
  const [transportCost, setTransportCost] = useState('');
  const [labourCost, setLabourCost] = useState('');
  const [otherCost, setOtherCost] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [movingProductId, setMovingProductId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Calculate total cost
  const totalCost = selectedIngredients.reduce((sum, ing) => sum + ing.subtotal, 0);
  const wastageAmount = (totalCost * parseFloat(wastagePercent || '0')) / 100;
  const finalTotalCost = totalCost + wastageAmount + parseFloat(transportCost || '0') + parseFloat(labourCost || '0') + parseFloat(otherCost || '0');

  // Fetch available materials
  const fetchAvailableMaterials = async () => {
    setIsLoadingMaterials(true);
    try {
      const response = await apiClient.post('/api/stock/inventory/', {});

      const data = response.data;

      // Handle different response structures
      const inventoryArray = Array.isArray(data)
        ? data
        : (data.inventory || data.data?.inventory || []);

      if (Array.isArray(inventoryArray) && inventoryArray.length > 0) {
        const formattedMaterials: RawMaterial[] = inventoryArray.map((item: any) => ({
          id: item.item_id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          cost: parseFloat(item.cost_per_unit) || 0,
          available: item.total_quantity,
          minStockLimit: item.stock_limit,
          defectiveQuantity: item.defective,
          created_at: item.created_at || new Date().toISOString()
        }));
        setAvailableMaterials(formattedMaterials);
      } else {
        console.warn('No inventory data found in response:', data);
        setAvailableMaterials([]);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
      setError('Failed to fetch available materials');
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  // Fetch casting products
  const fetchCastings = async () => {
    setIsLoading(true);
    try {
      const products = await viewCastings();
      setCastings(products);
    } catch (error) {
      console.error('Error fetching castings:', error);
      setError('Failed to fetch casting products');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter castings based on search query
  const filteredCastings = castings.filter(casting =>
    casting.product_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Move to Production (Action 3)
  const handleMoveToProduction = async (productId: string) => {
    setMovingProductId(productId);
    setError(null);
    setSuccess(null);

    try {
      const payload: MoveToProductionPayload = {
        operation: "MoveToProduction",
        product_id: productId,
        username: user.username
      };

      const response = await moveToProduction(payload);

      if (response.message === "Casting product moved to production successfully") {
        setSuccess(`Success! ${productId} is now a live product.`);
        // Refresh list or remove item locally
        setCastings(prev => prev.filter(item => item.product_id !== productId));

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        setError('Failed to move product to production');
      }
    } catch (err: any) {
      console.error('Error moving to production:', err);
      setError(err.message || 'Failed to move casting product to production');
    } finally {
      setMovingProductId(null);
    }
  };

  const handleDeleteCasting = async (productId: string) => {
    setDeletingProductId(productId);
    setError(null);
    setSuccess(null);

    try {
      const payload: DeleteCastingPayload = {
        operation: 'DeleteCastingProduct',
        product_id: productId,
        username: user.username
      };

      const response = await deleteCastingProduct(payload);

      if (response.message?.toLowerCase().includes('deleted')) {
        setSuccess(`Casting ${productId} deleted successfully.`);
        setCastings(prev => prev.filter(item => item.product_id !== productId));
      } else {
        setError(response.message || 'Failed to delete casting product');
      }
    } catch (err: any) {
      console.error('Error deleting casting:', err);
      setError(err.message || 'Failed to delete casting product');
    } finally {
      setDeletingProductId(null);
    }
  };

  useEffect(() => {
    fetchCastings();
  }, [location.pathname]);

  useEffect(() => {
    if (showWorkbench) {
      fetchAvailableMaterials();
    }
  }, [showWorkbench]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };

    if (isFilterDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterDropdownOpen]);

  // Filter materials based on search
  const filteredMaterials = availableMaterials.filter(material => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    switch (searchFilter) {
      case 'name':
        return material.name.toLowerCase().includes(query);
      case 'id':
        return material.id.toLowerCase().includes(query);
      case 'cost':
        return material.cost.toString().includes(query);
      case 'all':
      default:
        return (
          material.name.toLowerCase().includes(query) ||
          material.id.toLowerCase().includes(query) ||
          material.cost.toString().includes(query)
        );
    }
  });

  const getFilterLabel = () => {
    switch (searchFilter) {
      case 'name':
        return 'Name';
      case 'id':
        return 'ID';
      case 'cost':
        return 'Cost';
      case 'all':
      default:
        return 'All';
    }
  };

  // Add material to selected ingredients
  const handleAddMaterial = (material: RawMaterial) => {
    const exists = selectedIngredients.find(ing => ing.itemId === material.id);
    if (exists) {
      // Update quantity if already exists
      const updated = selectedIngredients.map(ing => {
        if (ing.itemId === material.id) {
          const currentQty = typeof ing.qtyUsed === 'string' ? parseFloat(ing.qtyUsed) || 0 : ing.qtyUsed;
          const newQty = currentQty + 1;
          return { ...ing, qtyUsed: newQty, subtotal: newQty * ing.unitCost };
        }
        return ing;
      });
      setSelectedIngredients(updated);
    } else {
      // Add new ingredient
      setSelectedIngredients([
        ...selectedIngredients,
        {
          itemId: material.id,
          name: material.name,
          stockAvailable: material.available,
          unitCost: material.cost,
          qtyUsed: 1,
          subtotal: material.cost
        }
      ]);
    }
    setSearchQuery('');
  };

  // Update quantity for an ingredient
  const handleUpdateQuantity = (itemId: string, newQty: string | number) => {
    // If input is a string, we still want to calculate subtotal based on numeric value
    // If it's an empty string, treat it as 0 for subtotal but keep it empty in input
    const numericQty = typeof newQty === 'string' ? parseFloat(newQty) : newQty;

    // Allow empty string or valid number (including 0)
    // We don't strictly block negative numbers here to allow typing flexibility, 
    // but subtotal logic could handle it. Original code had `if (newQty < 0) return;`
    // We'll re-add a check if numericQty is valid number and negative.
    if (!isNaN(numericQty) && numericQty < 0) return;

    const validNumericQty = isNaN(numericQty) ? 0 : numericQty;

    const updated = selectedIngredients.map(ing =>
      ing.itemId === itemId
        ? { ...ing, qtyUsed: newQty, subtotal: validNumericQty * ing.unitCost }
        : ing
    );
    setSelectedIngredients(updated);
  };

  // Remove ingredient
  const handleRemoveIngredient = (itemId: string) => {
    setSelectedIngredients(selectedIngredients.filter(ing => ing.itemId !== itemId));
  };

  // Save casting
  const handleSaveCasting = async () => {
    if (!castingName.trim()) {
      setError('Please enter a casting reference name');
      return;
    }

    if (selectedIngredients.length === 0) {
      setError('Please select at least one ingredient');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const stockNeeded: { [key: string]: number } = {};
      selectedIngredients.forEach(ing => {
        stockNeeded[ing.itemId] = typeof ing.qtyUsed === 'string'
          ? (parseFloat(ing.qtyUsed) || 0)
          : ing.qtyUsed;
      });

      const payload: CreateCastingPayload = {
        operation: "CreateCastingProduct",
        product_name: castingName,
        stock_needed: stockNeeded,
        username: user.username,
        wastage_percent: parseFloat(wastagePercent || '0'),
        transport_cost: parseFloat(transportCost || '0'),
        labour_cost: parseFloat(labourCost || '0'),
        other_cost: parseFloat(otherCost || '0')
      };

      const response = await createCastingProduct(payload);

      if (response.message === "Casting product created successfully") {
        setSuccess('Product created successfully');
        // Reset form
        setCastingName('');
        setSelectedIngredients([]);
        setWastagePercent('');
        setTransportCost('');
        setLabourCost('');
        setOtherCost('');
        setSearchQuery('');

        // Refresh castings list
        fetchCastings();

        // Close workbench after 2 seconds
        setTimeout(() => {
          setShowWorkbench(false);
          setSuccess(null);
        }, 2000);
      } else {
        setError('Product not created');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create casting product');
    } finally {
      setIsSaving(false);
    }
  };

  // Close workbench
  const handleCloseWorkbench = () => {
    setShowWorkbench(false);
    setCastingName('');
    setSelectedIngredients([]);
    setWastagePercent('');
    setTransportCost('');
    setLabourCost('');
    setOtherCost('');
    setSearchQuery('');
    setSearchFilter('all');
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 dark:from-orange-800 dark:via-amber-800 dark:to-yellow-800 rounded-2xl shadow-xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">Product Costing / Prototyping</h1>
            <p className="text-orange-100 dark:text-orange-200 text-sm md:text-base mt-1">
              Draft new products and calculate costs using existing inventory.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto">
            <button
              onClick={fetchCastings}
              disabled={isLoading}
              className={`flex items-center px-4 md:px-5 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-xl font-medium shadow-lg hover:bg-white/30 hover:shadow-xl hover:scale-105 transition-all duration-200 text-sm md:text-base whitespace-nowrap ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              title="Refresh Costing List"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowWorkbench(true)}
              className="flex items-center px-4 md:px-5 py-2.5 bg-white text-orange-600 dark:text-orange-700 rounded-xl font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 text-sm md:text-base whitespace-nowrap"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Sample
            </button>
          </div>
        </div>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-400 dark:border-red-500 p-4 rounded-md">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-400 dark:border-green-500 p-4 rounded-md">
          <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search costing products by name..."
              className="w-full pl-10 pr-10 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-900/30 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                title="Clear search"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {filteredCastings.length} result{filteredCastings.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Castings Grid */}
      {isLoading ? (
        <CostingSkeleton />
      ) : filteredCastings.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          {searchQuery ? (
            <>
              <p className="text-gray-500 text-lg">No costing products match your search.</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Clear search
              </button>
            </>
          ) : (
            <p className="text-gray-500 text-lg">No costing drafts found. Create your first sample to get started.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCastings.map((product) => (
            <CostingCard
              key={product.product_id}
              product={product}
              onMove={handleMoveToProduction}
              onDelete={handleDeleteCasting}
              isMoving={movingProductId === product.product_id}
              isDeleting={deletingProductId === product.product_id}
            />
          ))}
        </div>
      )}

      {/* Workbench Drawer */}
      {showWorkbench && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={handleCloseWorkbench} />
          <div className="absolute right-0 top-0 h-full w-full max-w-3xl bg-white shadow-xl flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-indigo-50">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Create New Sample</h2>
                <button
                  onClick={handleCloseWorkbench}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close"
                  aria-label="Close workbench"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  placeholder="Costing Reference Name (e.g., Test Bundle A)"
                  className="flex-1 mr-4 px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={castingName}
                  onChange={(e) => setCastingName(e.target.value)}
                />
                <div className="bg-white px-4 py-2 rounded-md border border-indigo-200">
                  <span className="text-sm text-gray-600">Current Total Cost:</span>
                  <span className="ml-2 text-lg font-bold text-indigo-600">
                    ₹{finalTotalCost.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border-l-4 border-green-400 p-4">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              )}

              {/* Section B: Inventory Selector */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Inventory Selector</h3>
                  <span className="text-sm text-gray-500">
                    {filteredMaterials.length} {filteredMaterials.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, ID, or cost..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="relative" ref={filterDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                      className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      title="Search filter options"
                      aria-label="Search filter options"
                    >
                      <Filter className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">{getFilterLabel()}</span>
                      {isFilterDropdownOpen ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                    {isFilterDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSearchFilter('all');
                              setIsFilterDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${searchFilter === 'all' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'
                              }`}
                          >
                            All Fields
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchFilter('name');
                              setIsFilterDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${searchFilter === 'name' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'
                              }`}
                          >
                            Name Only
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchFilter('id');
                              setIsFilterDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${searchFilter === 'id' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'
                              }`}
                          >
                            ID Only
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchFilter('cost');
                              setIsFilterDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${searchFilter === 'cost' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'
                              }`}
                          >
                            Cost Only
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg max-h-80 overflow-y-auto bg-gray-50">
                  {isLoadingMaterials ? (
                    <div className="p-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
                      <p className="text-sm text-gray-500">Loading materials...</p>
                    </div>
                  ) : filteredMaterials.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Search className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600 font-medium">No materials found</p>
                      <p className="text-xs text-gray-500 mt-1">Try adjusting your search or filter</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {filteredMaterials.map((material) => {
                        const stockLevel = material.available > (material.minStockLimit || 0) ? 'high' : 'low';
                        const stockColor = stockLevel === 'high' ? 'text-green-600' : 'text-orange-600';
                        const stockBg = stockLevel === 'high' ? 'bg-green-50' : 'bg-orange-50';

                        return (
                          <button
                            key={material.id}
                            onClick={() => handleAddMaterial(material)}
                            className="w-full px-4 py-3.5 text-left hover:bg-white transition-all duration-150 group bg-gray-50"
                            title={`Add ${material.name} to ingredients`}
                            aria-label={`Add ${material.name} to ingredients`}
                          >
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                                  {material.name}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">ID: {material.id}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-bold text-gray-900 mb-1">
                                  ₹{material.cost.toFixed(2)}
                                  <span className="text-xs font-normal text-gray-500">/{material.unit}</span>
                                </p>
                                <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stockBg} ${stockColor}`}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></span>
                                  {material.available} {material.unit}
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 pt-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-xs text-indigo-600 font-medium">Click to add →</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Section C: Selected Ingredients */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Selected Ingredients</h3>
                  {selectedIngredients.length > 0 && (
                    <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                      {selectedIngredients.length} {selectedIngredients.length === 1 ? 'item' : 'items'}
                    </span>
                  )}
                </div>
                {selectedIngredients.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Plus className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600 mb-1">No ingredients selected</p>
                    <p className="text-xs text-gray-500">Click on items above to add them to your recipe</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                          <tr>
                            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Item Name
                            </th>
                            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Stock Available
                            </th>
                            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Unit Cost
                            </th>
                            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Qty Used
                            </th>
                            <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Subtotal
                            </th>
                            <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedIngredients.map((ing, index) => (
                            <tr key={ing.itemId} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-4 text-sm">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                    <span className="text-xs font-bold text-indigo-600">{index + 1}</span>
                                  </div>
                                  <span className="font-medium text-gray-900">{ing.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-sm">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ing.stockAvailable > (typeof ing.qtyUsed === 'string' ? parseFloat(ing.qtyUsed) || 0 : ing.qtyUsed)
                                  ? 'bg-green-50 text-green-700'
                                  : 'bg-red-50 text-red-700'
                                  }`}>
                                  {ing.stockAvailable}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-sm font-medium text-gray-700">
                                ₹{ing.unitCost.toFixed(2)}
                              </td>
                              <td className="px-4 py-4 text-sm">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  max={ing.stockAvailable}
                                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                  value={ing.qtyUsed}
                                  onChange={(e) =>
                                    handleUpdateQuantity(ing.itemId, e.target.value)
                                  }
                                  aria-label={`Quantity for ${ing.name}`}
                                  title={`Quantity for ${ing.name}`}
                                />
                              </td>
                              <td className="px-4 py-4 text-sm">
                                <span className="font-bold text-gray-900">₹{ing.subtotal.toFixed(2)}</span>
                              </td>
                              <td className="px-4 py-4 text-sm text-center">
                                <button
                                  onClick={() => handleRemoveIngredient(ing.itemId)}
                                  className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                                  title="Remove ingredient"
                                  aria-label={`Remove ${ing.name}`}
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td colSpan={4} className="px-4 py-4 text-sm font-semibold text-gray-700 text-right">
                              Materials Subtotal:
                            </td>
                            <td colSpan={2} className="px-4 py-4 text-sm font-bold text-indigo-600">
                              ₹{totalCost.toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Costs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Wastage Percent
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    value={wastagePercent}
                    onChange={(e) => setWastagePercent(e.target.value)}
                    placeholder="0.00"
                    aria-label="Wastage Percent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transport Cost
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    value={transportCost}
                    onChange={(e) => setTransportCost(e.target.value)}
                    placeholder="0.00"
                    aria-label="Transport Cost"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Labour Cost
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    value={labourCost}
                    onChange={(e) => setLabourCost(e.target.value)}
                    placeholder="0.00"
                    aria-label="Labour Cost"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Other Cost
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    value={otherCost}
                    onChange={(e) => setOtherCost(e.target.value)}
                    placeholder="0.00"
                    aria-label="Other Cost"
                  />
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={handleCloseWorkbench}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCasting}
                disabled={isSaving}
                className={`px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center ${isSaving ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Saving...
                  </>
                ) : (
                  'Save Casting'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Costing;
