import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Plus, Search, Loader2, X, RefreshCw, Pencil, Trash2,
  Package, ChevronRight, AlertCircle, CheckCircle2, Lock, ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  createCastingProduct,
  viewCastings,
  CastingProductResponse,
  moveToProduction,
  deleteCastingProduct,
  updateCastingQuantities,
} from '../utils/castingApi';
import { apiClient } from '../utils/api';
import { RawMaterial } from '../types';
import { CostingSkeleton } from '../components/skeletons/CostingSkeleton';
import DeleteConfirmationDialog from '../components/DeleteConfirmationDialog';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatMoney = (amount: number | string | undefined | null): string => {
  const num = parseFloat(String(amount ?? 0));
  return `₹${(Number.isFinite(num) ? num : 0).toFixed(2)}`;
};

const parseQty = (val: string | number): number => {
  const n = parseFloat(String(val));
  return Number.isFinite(n) ? n : 0;
};

// ─── Costing Card ─────────────────────────────────────────────────────────────

interface CostingCardProps {
  product: CastingProductResponse;
  onMove: (id: string) => void;
  onEdit: (product: CastingProductResponse) => void;
  onDelete: (id: string, name: string) => void;
  isMoving?: boolean;
}

const CostingCard: React.FC<CostingCardProps> = ({
  product, onMove, onEdit, onDelete, isMoving = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const materialEntries = Object.entries(product.stock_needed ?? {});
  const visibleMaterials = expanded ? materialEntries : materialEntries.slice(0, 4);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col transition-shadow hover:shadow-md">
      {/* Card Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-white leading-tight">{product.product_name}</h3>
            <p className="text-orange-100 text-xs mt-0.5">
              Created: {new Date(product.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <span className="bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">Draft</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex-1 space-y-4">
        {/* Materials — Backend Calculated */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Materials</span>
            <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">Backend-calculated</span>
          </div>
          {materialEntries.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No materials calculated</p>
          ) : (
            <div className="space-y-1">
              {visibleMaterials.map(([name, qty]) => (
                <div key={name} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-700 truncate max-w-[65%]" title={name}>{name}</span>
                  <span className="text-sm font-bold text-gray-900 tabular-nums">{parseQty(qty)}</span>
                </div>
              ))}
              {materialEntries.length > 4 && (
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-amber-600 hover:text-amber-700 font-semibold mt-1 flex items-center gap-0.5"
                >
                  {expanded ? 'Show less' : `+${materialEntries.length - 4} more`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Max Producible */}
        {product.max_produce !== undefined && (
          <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2">
            <span className="text-xs font-semibold text-green-700">Max Producible</span>
            <span className="text-sm font-bold text-green-800">{product.max_produce.toLocaleString('en-IN')}</span>
          </div>
        )}

        {/* Cost Breakdown */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Cost Breakdown</p>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Materials</span><span className="font-medium">{formatMoney(product.production_cost_total)}</span>
            </div>
            <div className="flex justify-between">
              <span>Labour</span><span className="font-medium">{formatMoney(product.labour_cost)}</span>
            </div>
            <div className="flex justify-between">
              <span>Transport</span><span className="font-medium">{formatMoney(product.transport_cost)}</span>
            </div>
            <div className="flex justify-between">
              <span>Other</span><span className="font-medium">{formatMoney(product.other_cost)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Wastage ({product.wastage_percent}%)</span>
              <span className="font-medium">{formatMoney(product.wastage_amount)}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-dashed border-gray-200 flex justify-between items-center">
            <span className="font-bold text-gray-700">Total Est. Cost</span>
            <span className="text-xl font-bold text-green-600">{formatMoney(product.total_cost)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-4 pt-1 grid grid-cols-3 gap-2">
        <button
          onClick={() => onMove(product.product_id)}
          disabled={isMoving}
          className={`col-span-1 flex items-center justify-center gap-1 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm ${isMoving ? 'opacity-75 cursor-not-allowed' : ''}`}
        >
          {isMoving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
          {isMoving ? 'Moving' : 'Produce'}
        </button>
        <button
          onClick={() => onEdit(product)}
          className="col-span-1 flex items-center justify-center gap-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit Qty
        </button>
        <button
          onClick={() => onDelete(product.product_id, product.product_name)}
          className="col-span-1 flex items-center justify-center gap-1 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
};

// ─── Edit Quantities Modal ────────────────────────────────────────────────────

interface EditQtyModalProps {
  product: CastingProductResponse;
  onClose: () => void;
  onSuccess: (updatedProduct: CastingProductResponse) => void;
}

const EditQtyModal: React.FC<EditQtyModalProps> = ({ product, onClose, onSuccess }) => {
  const [quantities, setQuantities] = useState<{ [name: string]: string }>(() => {
    const init: { [name: string]: string } = {};
    Object.entries(product.stock_needed ?? {}).forEach(([name, qty]) => {
      init[name] = String(parseQty(qty));
    });
    return init;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const stockNeeded: { [name: string]: number } = {};
      Object.entries(quantities).forEach(([name, val]) => {
        stockNeeded[name] = parseQty(val);
      });

      // New API — no operation or username required
      const response = await updateCastingQuantities({
        product_id: product.product_id,
        stock_needed: stockNeeded,
      });

      // Build fully updated product from the rich API response
      // response.stock_needed has numbers, cast to string map for CastingProductResponse
      const updatedStockNeeded: { [name: string]: string } = {};
      Object.entries(response.stock_needed).forEach(([name, qty]) => {
        updatedStockNeeded[name] = String(qty);
      });

      const updatedProduct: CastingProductResponse = {
        ...product,
        stock_needed: updatedStockNeeded,
        max_produce: response.max_produce,
        production_cost_breakdown: Object.fromEntries(
          Object.entries(response.production_cost_breakdown).map(([k, v]) => [k, String(v)])
        ),
        production_cost_total: response.production_cost_total,
        wastage_percent: response.wastage_percent,
        wastage_amount: response.wastage_amount,
        labour_cost: response.labour_cost,
        transport_cost: response.transport_cost,
        other_cost: response.other_cost,
        total_cost: response.total_cost,
      };

      onSuccess(updatedProduct);
    } catch (err: any) {
      setError(err.message || 'Failed to update quantities');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit Material Quantities</h2>
            <p className="text-sm text-gray-500 mt-0.5">{product.product_name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="mx-6 mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          <Lock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 font-medium">
            Only material quantities can be adjusted. Material selection and product structure are locked.
          </p>
        </div>

        {/* Quantity Inputs */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border-l-4 border-red-500 rounded-lg px-3 py-2.5">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
            {Object.entries(quantities).map(([name, qty]) => (
              <div key={name} className="flex items-center justify-between px-4 py-3 gap-4">
                <span className="text-sm font-medium text-gray-800 flex-1 truncate" title={name}>{name}</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={qty}
                  onChange={(e) => setQuantities(prev => ({ ...prev, [name]: e.target.value }))}
                  className="w-28 px-3 py-1.5 border-2 border-gray-300 rounded-lg text-center text-sm font-bold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  aria-label={`Quantity for ${name}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm ${isSaving ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Create Drawer ────────────────────────────────────────────────────────────

interface CreateDrawerProps {
  username: string;
  onClose: () => void;
  onSuccess: (product: CastingProductResponse) => void;
}

const CreateDrawer: React.FC<CreateDrawerProps> = ({ username, onClose, onSuccess }) => {
  const [productName, setProductName] = useState('');
  const [labourCost, setLabourCost] = useState('');
  const [transportCost, setTransportCost] = useState('');
  const [otherCost, setOtherCost] = useState('');
  const [wastagePercent, setWastagePercent] = useState('');

  const [availableMaterials, setAvailableMaterials] = useState<RawMaterial[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const [materialSearch, setMaterialSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]); // material names

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null); // holds the create response to show calculated qtys

  // Fetch materials on mount
  useEffect(() => {
    const fetchMaterials = async () => {
      setIsLoadingMaterials(true);
      try {
        const response = await apiClient.post('/api/stock/inventory/', {});
        const data = response.data;
        const inventoryArray = Array.isArray(data) ? data : (data.inventory || data.data?.inventory || []);
        if (Array.isArray(inventoryArray)) {
          const formatted: RawMaterial[] = inventoryArray.map((item: any) => ({
            id: item.item_id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            cost: parseFloat(item.cost_per_unit) || 0,
            available: item.total_quantity,
            minStockLimit: item.stock_limit,
            defectiveQuantity: item.defective,
            created_at: item.created_at || new Date().toISOString(),
          }));
          setAvailableMaterials(formatted);
        }
      } catch {
        setError('Failed to load inventory materials');
      } finally {
        setIsLoadingMaterials(false);
      }
    };
    fetchMaterials();
  }, []);

  const filteredMaterials = availableMaterials.filter(m =>
    m.name.toLowerCase().includes(materialSearch.toLowerCase())
  );

  const toggleMaterial = (name: string) => {
    setSelectedItems(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const removeMaterial = (name: string) => {
    setSelectedItems(prev => prev.filter(n => n !== name));
  };

  const handleSubmit = async () => {
    if (!productName.trim()) { setError('Product name is required'); return; }
    if (selectedItems.length === 0) { setError('Select at least one material'); return; }

    setIsSaving(true);
    setError(null);
    setResult(null);

    try {
      const response = await createCastingProduct({
        product_name: productName.trim(),
        selected_items: selectedItems,
        username,
        labour_cost: parseFloat(labourCost || '0'),
        transport_cost: parseFloat(transportCost || '0'),
        other_cost: parseFloat(otherCost || '0'),
        wastage_percent: parseFloat(wastagePercent || '0'),
      });

      // Show the calculated result before closing
      setResult(response);

      // Build a CastingProductResponse from the create response and notify parent
      const newProduct: CastingProductResponse = {
        product_id: response.product_id,
        product_name: response.product_name,
        stock_needed: response.stock_needed,
        max_produce: response.max_produce,
        production_cost_breakdown: response.production_cost_breakdown,
        production_cost_total: response.production_cost_total,
        wastage_percent: response.wastage_percent,
        wastage_amount: response.wastage_amount,
        labour_cost: response.labour_cost,
        transport_cost: response.transport_cost,
        other_cost: response.other_cost,
        total_cost: response.total_cost,
        created_at: new Date().toISOString(),
      };

      // Notify parent after a short display so user can see results
      setTimeout(() => { onSuccess(newProduct); }, 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to create costing');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col">

        {/* Drawer Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Create New Costing</h2>
            <p className="text-orange-100 text-sm mt-0.5">Select materials — quantities are calculated by the system</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Result panel — shown after successful creation */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-bold text-green-800">Costing Created Successfully!</span>
              </div>
              <p className="text-sm text-green-700 mb-3">Backend-calculated material quantities:</p>
              <div className="space-y-1.5">
                {Object.entries(result.stock_needed ?? {}).map(([name, qty]) => (
                  <div key={name} className="flex justify-between items-center bg-white rounded-lg px-3 py-2 border border-green-100">
                    <span className="text-sm font-medium text-gray-800">{name}</span>
                    <span className="text-sm font-bold text-green-700">{parseQty(qty as string)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-green-200 flex justify-between">
                <span className="text-sm font-semibold text-green-700">Total Cost</span>
                <span className="text-lg font-bold text-green-800">{formatMoney(result.total_cost)}</span>
              </div>
              <p className="text-xs text-green-600 mt-2 text-center">Closing in a moment…</p>
            </div>
          )}

          {!result && (
            <>
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border-l-4 border-red-500 rounded-lg px-4 py-3">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Step 1 — Product Name */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Product / Costing Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., SIVA MAT 75×60×6"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-medium"
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                />
              </div>

              {/* Step 2 — Additional Costs */}
              <div>
                <p className="text-sm font-bold text-gray-700 mb-3">Costs & Overheads</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Labour Cost (₹)', value: labourCost, setter: setLabourCost },
                    { label: 'Transport Cost (₹)', value: transportCost, setter: setTransportCost },
                    { label: 'Other Cost (₹)', value: otherCost, setter: setOtherCost },
                    { label: 'Wastage (%)', value: wastagePercent, setter: setWastagePercent },
                  ].map(({ label, value, setter }) => (
                    <div key={label}>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                        value={value}
                        onChange={e => setter(e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 3 — Material Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-gray-700">
                    Select Materials <span className="text-red-500">*</span>
                  </p>
                  {selectedItems.length > 0 && (
                    <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">
                      {selectedItems.length} selected
                    </span>
                  )}
                </div>

                {/* Info note — no quantity input */}
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-3">
                  <Lock className="h-4 w-4 text-blue-500 shrink-0" />
                  <p className="text-xs text-blue-700 font-medium">Quantities will be calculated automatically by the system after submission.</p>
                </div>

                {/* Selected chips */}
                {selectedItems.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3 p-3 bg-orange-50 border border-orange-100 rounded-xl">
                    {selectedItems.map(name => (
                      <span key={name} className="inline-flex items-center gap-1 bg-white border border-orange-200 text-orange-800 text-xs font-semibold px-2.5 py-1.5 rounded-full shadow-sm">
                        {name}
                        <button type="button" onClick={() => removeMaterial(name)} className="text-orange-400 hover:text-orange-600 ml-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Search */}
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search materials..."
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-xl focus:border-orange-500 transition-all text-sm"
                    value={materialSearch}
                    onChange={e => setMaterialSearch(e.target.value)}
                  />
                </div>

                {/* Material List */}
                <div className="border-2 border-gray-200 rounded-xl max-h-64 overflow-y-auto bg-gray-50">
                  {isLoadingMaterials ? (
                    <div className="p-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-orange-500 mb-2" />
                      <p className="text-sm text-gray-500">Loading materials…</p>
                    </div>
                  ) : filteredMaterials.length === 0 ? (
                    <div className="p-8 text-center">
                      <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No materials found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filteredMaterials.map(m => {
                        const isSelected = selectedItems.includes(m.name);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => toggleMaterial(m.name)}
                            className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${isSelected ? 'bg-orange-50' : 'hover:bg-white'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                                {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" /></svg>}
                              </div>
                              <div>
                                <p className={`text-sm font-semibold ${isSelected ? 'text-orange-800' : 'text-gray-800'}`}>{m.name}</p>
                                <p className="text-xs text-gray-400">Available: {m.available} {m.unit}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-gray-700">₹{m.cost.toFixed(2)}</p>
                              <p className="text-xs text-gray-400">/ {m.unit}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer */}
        {!result && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-100 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving || !productName.trim() || selectedItems.length === 0}
              className={`px-6 py-2.5 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-sm flex items-center gap-2 ${isSaving || !productName.trim() || selectedItems.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              {isSaving ? 'Calculating…' : 'Create & Calculate'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Costing Page ────────────────────────────────────────────────────────

const Costing: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const [castings, setCastings] = useState<CastingProductResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [editTarget, setEditTarget] = useState<CastingProductResponse | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [movingProductId, setMovingProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchCastings = async () => {
    setIsLoading(true);
    try {
      const products = await viewCastings();
      setCastings(products);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch costings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCastings(); }, [location.pathname]);

  // Auto-dismiss messages
  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(null); setError(null); }, 4000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  const handleMoveToProduction = async (productId: string) => {
    setMovingProductId(productId);
    setError(null);
    try {
      const res = await moveToProduction({ operation: 'MoveToProduction', product_id: productId, username: user.username });
      if (res.message?.toLowerCase().includes('success')) {
        setSuccess('Product moved to production successfully');
        setCastings(prev => prev.filter(c => c.product_id !== productId));
      } else {
        setError('Failed to move product to production');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to move to production');
    } finally {
      setMovingProductId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteCastingProduct({
        operation: 'DeleteCastingProduct',
        product_id: deleteTarget.id,
        username: user.username,
      });
      if (res.message?.toLowerCase().includes('deleted') || res.message?.toLowerCase().includes('success')) {
        setSuccess(`"${deleteTarget.name}" deleted successfully`);
        setCastings(prev => prev.filter(c => c.product_id !== deleteTarget.id));
      } else {
        setError(res.message || 'Failed to delete');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete costing');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleEditSuccess = (updatedProduct: CastingProductResponse) => {
    setCastings(prev => prev.map(c => c.product_id === updatedProduct.product_id ? updatedProduct : c));
    setEditTarget(null);
    setSuccess('Quantities updated successfully');
  };

  const handleCreateSuccess = (newProduct: CastingProductResponse) => {
    setCastings(prev => [newProduct, ...prev]);
    setShowCreateDrawer(false);
    setSuccess(`"${newProduct.product_name}" created — quantities calculated by backend`);
  };

  const filteredCastings = castings.filter(c =>
    c.product_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-500 rounded-2xl shadow-xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">Product Costing</h1>
            <p className="text-orange-100 text-sm md:text-base mt-1">
              Select materials — the system calculates required quantities automatically
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-3">
            <button
              onClick={fetchCastings}
              disabled={isLoading}
              className={`flex items-center px-5 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-xl font-medium shadow-lg hover:bg-white/30 transition-all ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateDrawer(true)}
              className="flex items-center px-5 py-2.5 bg-white text-orange-600 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Costing
            </button>
          </div>
        </div>
      </div>

      {/* Global messages */}
      {(error || success) && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border-l-4 ${success ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
          {success ? <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /> : <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />}
          <p className={`text-sm font-medium ${success ? 'text-green-700' : 'text-red-700'}`}>{success || error}</p>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by product name…"
            className="w-full pl-10 pr-10 py-2.5 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-xs text-gray-500 mt-2">{filteredCastings.length} result{filteredCastings.length !== 1 ? 's' : ''} for "{searchQuery}"</p>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <CostingSkeleton />
      ) : filteredCastings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="h-16 w-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="h-8 w-8 text-orange-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">
            {searchQuery ? 'No results found' : 'No costing drafts yet'}
          </h3>
          <p className="text-sm text-gray-400">
            {searchQuery ? 'Try a different search term' : 'Click "New Costing" to create your first product costing'}
          </p>
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="mt-3 text-orange-600 font-semibold text-sm hover:underline">
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCastings.map(product => (
            <CostingCard
              key={product.product_id}
              product={product}
              onMove={handleMoveToProduction}
              onEdit={setEditTarget}
              onDelete={(id, name) => setDeleteTarget({ id, name })}
              isMoving={movingProductId === product.product_id}
            />
          ))}
        </div>
      )}

      {/* Create Drawer */}
      {showCreateDrawer && (
        <CreateDrawer
          username={user.username}
          onClose={() => setShowCreateDrawer(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Edit Modal */}
      {editTarget && (
        <EditQtyModal
          product={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={handleEditSuccess}
        />
      )}


      {/* Delete Confirmation */}
      <DeleteConfirmationDialog
        isOpen={!!deleteTarget}
        title="Delete Costing"
        message={`Are you sure you want to delete the costing for "${deleteTarget?.name}"? This action cannot be undone.`}
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Costing;
