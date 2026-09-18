import React, { useState, useEffect } from 'react';
import { X, Loader2, MoveRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { productGroupApi, ProductGroup } from '../utils/productionApi';
import { Product } from '../types';

interface MoveProductModalProps {
  product: Product;
  sourceGroupId: string | null;
  sourceGroupName: string;
  isOpen: boolean;
  onClose: () => void;
  /** Called after the API succeeds — parent should refresh grouped data */
  onSuccess: () => void;
}

export const MoveProductModal: React.FC<MoveProductModalProps> = ({
  product,
  sourceGroupId,
  sourceGroupName,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [availableGroups, setAvailableGroups] = useState<ProductGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [selectedTargetGroupId, setSelectedTargetGroupId] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  // Fetch groups when modal opens — same API call as NewProductForm
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setIsLoadingGroups(true);
    setMoveError(null);
    setSelectedTargetGroupId('');

    const fetchGroups = async () => {
      try {
        const response = await productGroupApi.getGroups();
        const data = response.data;
        const groupsArray: ProductGroup[] = Array.isArray(data)
          ? data
          : (data?.groups || []);

        if (!cancelled) {
          // Exclude the product's current group from selectable targets
          const filtered = groupsArray.filter(
            g => g.group_id !== sourceGroupId
          );
          setAvailableGroups(filtered);
        }
      } catch {
        if (!cancelled) {
          setMoveError('Failed to load groups. Please try again.');
        }
      } finally {
        if (!cancelled) setIsLoadingGroups(false);
      }
    };

    fetchGroups();
    return () => { cancelled = true; };
  }, [isOpen, sourceGroupId]);

  const handleConfirm = async () => {
    if (!selectedTargetGroupId) return;

    setIsMoving(true);
    setMoveError(null);

    try {
      await productGroupApi.moveProduct(product.id, selectedTargetGroupId, sourceGroupId);
      // Notify parent — parent will show success toast and refresh grouped data
      onSuccess();
      onClose();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to move product. Please try again.';
      setMoveError(message);
    } finally {
      setIsMoving(false);
    }
  };

  const handleClose = () => {
    if (isMoving) return; // prevent closing mid-request
    onClose();
  };

  if (!isOpen) return null;

  const selectedGroup = availableGroups.find(g => g.group_id === selectedTargetGroupId);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      aria-modal="true"
      role="dialog"
      aria-labelledby="move-product-modal-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
              <MoveRight className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2
              id="move-product-modal-title"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              Move Product
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isMoving}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close move product dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Product name */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-600">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5 uppercase tracking-wide">Product</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{product.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{product.id}</p>
          </div>

          {/* Source group */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Current Group
            </label>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400 flex-shrink-0" />
              <span className="text-sm font-medium text-amber-900 dark:text-amber-200 truncate">
                {sourceGroupName}
              </span>
            </div>
          </div>

          {/* Target group selector */}
          <div>
            <label
              htmlFor="move-target-group"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Move To <span className="text-red-500">*</span>
            </label>

            {isLoadingGroups ? (
              <div className="flex items-center gap-2 px-3 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-500 dark:text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                Loading groups…
              </div>
            ) : availableGroups.length === 0 && !moveError ? (
              <div className="px-3 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-500 dark:text-gray-400">
                No other groups available.
              </div>
            ) : (
              <select
                id="move-target-group"
                value={selectedTargetGroupId}
                onChange={(e) => {
                  setSelectedTargetGroupId(e.target.value);
                  setMoveError(null);
                }}
                disabled={isMoving || isLoadingGroups}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                <option value="">Select target group…</option>
                {availableGroups.map(group => (
                  <option key={group.group_id} value={group.group_id}>
                    {group.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Preview arrow (only when a target is chosen) */}
          {selectedGroup && (
            <div className="flex items-center gap-3 text-sm">
              <span className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-lg font-medium truncate max-w-[130px]">
                {sourceGroupName}
              </span>
              <MoveRight className="h-4 w-4 text-indigo-500 flex-shrink-0" />
              <span className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-lg font-medium truncate max-w-[130px]">
                {selectedGroup.name}
              </span>
            </div>
          )}

          {/* Error */}
          {moveError && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-3">
              <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{moveError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            type="button"
            onClick={handleClose}
            disabled={isMoving}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedTargetGroupId || isMoving || isLoadingGroups}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isMoving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Moving…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Confirm Move
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
