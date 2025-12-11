import React, { useState } from 'react';
import { RawMaterial } from '../types';
import { Edit2, Trash2, ArrowUpDown, MessageCircle } from 'lucide-react';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import StockAdjustModal from './StockAdjustModal';
import { makeApiRequest } from '../utils/api';

interface PendingChanges {
  stock?: number;
  defective?: number;
  unit?: string;
  cost?: number;
  stockLimit?: number;
  gst?: number;
}

interface InventoryTableProps {
  materials: RawMaterial[];
  onUpdateStock: (materialId: string, quantity: number) => void;
  onSubtractStock: (materialId: string, quantity: number) => void;
  onUpdateStockLimit: (materialId: string, limit: number) => void;
  onUpdateDefective: (materialId: string, quantity: number) => void;
  onSubtractDefective: (materialId: string, quantity: number) => void;
  onUpdateMaterialDetails: (materialId: string, updates: {
    unit?: string;
    cost?: number;
    defective?: number;
    gst?: number;
  }) => void;
}

interface EditableFieldState {
  materialId: string;
  type: 'stock' | 'defective' | 'unit' | 'cost' | 'stockLimit' | 'gst' | null;
}

type SortField = 'name' | 'available' | 'defective' | 'cost' | 'totalCost' | 'stockLimit' | 'createdAt' | 'gst';
type SortDirection = 'asc' | 'desc';

// Helper function to safely format dates
const formatDate = (dateString: string | undefined) => {
  if (!dateString) {
    console.log('No date string provided');
    return null;
  }

  try {
    console.log('Raw date string:', dateString);

    // Try to convert ISO string first (standard format)
    let date = new Date(dateString);

    // If that fails, try different formats
    if (isNaN(date.getTime())) {
      // Try to parse DD/MM/YYYY
      const parts = dateString.split(/[\/\-]/);
      if (parts.length === 3) {
        // Try different date arrangements
        date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid date after all attempts:', dateString);
      return null;
    }

    return {
      date: format(date, 'MMM d, yyyy'),
      time: format(date, 'h:mm a')
    };
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return null;
  }
};

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return '₹' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const InventoryTable: React.FC<InventoryTableProps> = ({
  materials,
  onUpdateStock,
  onSubtractStock,
  onUpdateStockLimit,
  onUpdateDefective,
  onSubtractDefective,
  onUpdateMaterialDetails,
}) => {
  const { user } = useAuth();
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({});
  const [editingField, setEditingField] = useState<EditableFieldState>({
    materialId: '',
    type: null
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<string | null>(null);
  const [isDeletingMaterial, setIsDeletingMaterial] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalMode, setStockModalMode] = useState<'add' | 'subtract'>('add');
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [isStockProcessing, setIsStockProcessing] = useState(false);
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [remarksMaterial, setRemarksMaterial] = useState<RawMaterial | null>(null);
  const [remarksInput, setRemarksInput] = useState('');
  const [remarksLoading, setRemarksLoading] = useState(false);
  const [remarksError, setRemarksError] = useState<string | null>(null);
  const [viewedRemark, setViewedRemark] = useState<{ description: string; username: string; created_at: string } | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedMaterials = [...materials].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'available':
        comparison = a.available - b.available;
        break;
      case 'defective':
        comparison = (a.defectiveQuantity || 0) - (b.defectiveQuantity || 0);
        break;
      case 'cost':
        comparison = a.cost - b.cost;
        break;
      case 'totalCost':
        comparison = (a.cost * a.available) - (b.cost * b.available);
        break;
      case 'stockLimit':
        comparison = (a.minStockLimit || 0) - (b.minStockLimit || 0);
        break;
      case 'gst':
        comparison = (a.gst || 0) - (b.gst || 0);
        break;
      case 'createdAt':
        const dateA = new Date((a as any).created_at || 0);
        const dateB = new Date((b as any).created_at || 0);
        comparison = dateA.getTime() - dateB.getTime();
        break;
      default:
        comparison = 0;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleStockLimitChange = (materialId: string, value: number) => {
    setPendingChanges(prev => ({
      ...prev,
      stockLimit: value
    }));
  };

  const handleUnitChange = (materialId: string, value: string) => {
    setPendingChanges(prev => ({
      ...prev,
      unit: value
    }));
  };

  const handleCostChange = (materialId: string, value: number) => {
    setPendingChanges(prev => ({
      ...prev,
      cost: value
    }));
  };

  const handleUpdate = async (materialId: string) => {
    const changes = pendingChanges;
    if (!changes) return;

    let validatedDefective = changes.defective;
    let validatedStockLimit = changes.stockLimit;

    if (validatedDefective !== undefined) {
      const num = Number(validatedDefective);
      if (!isNaN(num)) {
        await onUpdateDefective(materialId, num);
      } else {
        setError('Invalid defective quantity entered.');
        return;
      }
    }

    if (validatedStockLimit !== undefined) {
      const num = Number(validatedStockLimit);
      if (!isNaN(num)) {
        await onUpdateStockLimit(materialId, num);
      } else {
        setError('Invalid stock limit entered.');
        return;
      }
    }

    if (changes.unit !== undefined || changes.cost !== undefined || changes.gst !== undefined) {
      await onUpdateMaterialDetails(materialId, {
        unit: changes.unit,
        cost: changes.cost,
        gst: changes.gst
      });
    }

    setPendingChanges({});
    handleCloseEdit();
  };

  const handleClearDefective = async (materialId: string) => {
    await onUpdateMaterialDetails(materialId, { defective: 0 });
    handleCloseEdit();
  };

  const handleEditClick = (materialId: string, type: EditableFieldState['type']) => {
    setEditingField({
      materialId,
      type
    });
  };

  const handleCloseEdit = () => {
    setEditingField({
      materialId: '',
      type: null
    });
  };

  const handleDeleteClick = (materialId: string) => {
    setMaterialToDelete(materialId);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!materialToDelete) return;
    setIsDeletingMaterial(true);
    try {
      const material = materials.find(m => m.id === materialToDelete);
      if (!material) throw new Error('Material not found');
      const response = await makeApiRequest({
        operation: 'DeleteStock',
        name: material.name,
        username: user.username
      });
      if (response && response.message && response.message.toLowerCase().includes('deleted successfully')) {
        setMessage('Stock deleted successfully.');
      }
      // Optionally, trigger a refresh here if needed
    } catch (e: any) {
      setError(e.message || 'Failed to delete stock.');
    } finally {
      setIsDeletingMaterial(false);
      setShowDeleteDialog(false);
      setMaterialToDelete(null);
    }
  };

  const handleAddStock = (material: RawMaterial) => {
    setSelectedMaterial(material);
    setStockModalMode('add');
    setShowStockModal(true);
  };

  const handleSubtractStock = (material: RawMaterial) => {
    setSelectedMaterial(material);
    setStockModalMode('subtract');
    setShowStockModal(true);
  };

  const handleStockModalConfirm = async (quantity: number) => {
    if (!selectedMaterial) return;
    setIsStockProcessing(true);
    setError(null);
    try {
      if (stockModalMode === 'add') {
        await onUpdateStock(selectedMaterial.id, quantity);
        setMessage(`Added ${quantity} units to stock '${selectedMaterial.name}'.`);
      } else {
        await onSubtractStock(selectedMaterial.id, quantity);
        setMessage(`Subtracted ${quantity} units from stock '${selectedMaterial.name}'.`);
      }
      setShowStockModal(false);
      setSelectedMaterial(null);
    } catch (e: any) {
      if (stockModalMode === 'add') {
        setError(e.message || `Failed to ${stockModalMode} stock.`);
      }
    } finally {
      setIsStockProcessing(false);
    }
  };

  const handleStockModalCancel = () => {
    setShowStockModal(false);
    setSelectedMaterial(null);
  };

  const openRemarksModal = (material: RawMaterial) => {
    setRemarksMaterial(material);
    setShowRemarksModal(true);
    setRemarksInput('');
    setRemarksError(null);
    setViewedRemark(null);
  };

  const closeRemarksModal = () => {
    setShowRemarksModal(false);
    setRemarksMaterial(null);
    setRemarksInput('');
    setRemarksError(null);
    setViewedRemark(null);
  };

  const handleSaveRemark = async () => {
    if (!remarksMaterial || !remarksInput.trim()) return;
    setRemarksLoading(true);
    setRemarksError(null);
    try {
      const response = await makeApiRequest({
        operation: 'CreateDescription',
        stock: remarksMaterial.name,
        description: remarksInput,
        username: user.username
      });
      if (response && response.message && response.message.toLowerCase().includes('saved')) {
        setViewedRemark({
          description: response.description,
          username: response.username,
          created_at: response.created_at
        });
        setRemarksInput('');
      }
    } catch (e: any) {
      setRemarksError(e.message || 'Failed to save remark.');
    } finally {
      setRemarksLoading(false);
    }
  };

  const handleViewRemark = async () => {
    if (!remarksMaterial) return;
    setRemarksLoading(true);
    setRemarksError(null);
    try {
      const response = await makeApiRequest({
        operation: 'GetDescription',
        stock: remarksMaterial.name
      });
      if (response && response.description) {
        setViewedRemark({
          description: response.description,
          username: response.username,
          created_at: response.created_at
        });
      } else {
        setViewedRemark(null);
        setRemarksError('No remarks found.');
      }
    } catch (e: any) {
      setRemarksError(e.message || 'Failed to fetch remark.');
    } finally {
      setRemarksLoading(false);
    }
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center space-x-1 w-full"
      title={`Sort by ${label}`}
      aria-label={`Sort by ${label}`}
    >
      <span>{label}</span>
      <ArrowUpDown size={14} aria-hidden="true" />
    </button>
  );

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded-lg">
          <thead className="bg-primary">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                <SortButton field="name" label="Material" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                <SortButton field="available" label="Available" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                <SortButton field="defective" label="Defective" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Total Qty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Unit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                <SortButton field="cost" label="Cost Per Unit" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                <SortButton field="totalCost" label="Total Cost" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                <SortButton field="gst" label="GST %" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                <SortButton field="stockLimit" label="Stock Limit" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedMaterials.map((material) => {
              const changes = pendingChanges;
              const hasChanges = Object.keys(changes).length > 0;
              const isEditingDefective = editingField.materialId === material.id && editingField.type === 'defective';
              const isEditingStock = editingField.materialId === material.id && editingField.type === 'stock';
              const isEditingUnit = editingField.materialId === material.id && editingField.type === 'unit';
              const isEditingCost = editingField.materialId === material.id && editingField.type === 'cost';
              const isEditingStockLimit = editingField.materialId === material.id && editingField.type === 'stockLimit';
              const isEditingGst = editingField.materialId === material.id && editingField.type === 'gst';

              return (
                <tr key={material.id} className={
                  material.minStockLimit && material.available <= material.minStockLimit
                    ? 'bg-yellow-50'
                    : ''
                }>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span>{material.name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleSubtractStock(material)}
                        className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 disabled:opacity-50"
                        disabled={loadingId === material.id}
                        title="Subtract quantity"
                        aria-label="Subtract quantity"
                      >
                        −
                      </button>
                      <span>{material.available} {material.unit}</span>
                      <button
                        onClick={() => handleAddStock(material)}
                        className="px-2 py-1 bg-green-100 text-green-600 rounded hover:bg-green-200 disabled:opacity-50"
                        disabled={loadingId === material.id}
                        title="Add quantity"
                        aria-label="Add quantity"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-2">
                        <span>{material.defectiveQuantity || 0} {material.unit}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {material.totalQuantity !== undefined ? material.totalQuantity : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isEditingUnit ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={changes.unit}
                          onChange={(e) => {
                            setPendingChanges(prev => ({
                              ...prev,
                              unit: e.target.value
                            }));
                          }}
                          className="w-20 px-2 py-1 border rounded"
                          title="Unit"
                          aria-label="Unit"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>{material.unit}</span>
                        <button
                          onClick={() => handleEditClick(material.id, 'unit')}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit unit"
                          aria-label="Edit unit"
                        >
                          <Edit2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isEditingCost ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={changes.cost}
                          onChange={(e) => {
                            setPendingChanges(prev => ({
                              ...prev,
                              cost: Number(e.target.value)
                            }));
                          }}
                          className="w-24 px-2 py-1 border rounded"
                          title="Cost per unit"
                          aria-label="Cost per unit"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>₹{material.cost}</span>
                        <button
                          onClick={() => handleEditClick(material.id, 'cost')}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit cost"
                          aria-label="Edit cost"
                        >
                          <Edit2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isEditingGst ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={changes.gst}
                          onChange={(e) => {
                            setPendingChanges(prev => ({
                              ...prev,
                              gst: Number(e.target.value)
                            }));
                          }}
                          className="w-20 px-2 py-1 border rounded"
                          title="GST %"
                          aria-label="GST %"
                          min="0"
                          step="0.1"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>{material.gst || 0}%</span>
                        <button
                          onClick={() => handleEditClick(material.id, 'gst')}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit GST"
                          aria-label="Edit GST"
                        >
                          <Edit2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isEditingStockLimit ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={changes.stockLimit}
                          onChange={(e) => {
                            setPendingChanges(prev => ({
                              ...prev,
                              stockLimit: Number(e.target.value)
                            }));
                          }}
                          className="w-20 px-2 py-1 border rounded text-sm"
                          title="Stock limit"
                          aria-label="Stock limit"
                          placeholder="Enter limit"
                        />
                        <span className="text-sm text-gray-500">{material.unit}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>{material.minStockLimit || 0} {material.unit}</span>
                        <button
                          onClick={() => handleEditClick(material.id, 'stockLimit')}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit stock limit"
                          aria-label="Edit stock limit"
                        >
                          <Edit2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap flex items-center gap-2">
                    {hasChanges && (
                      <button
                        onClick={() => handleUpdate(material.id)}
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                      >
                        Save Changes
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteClick(material.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete material"
                      aria-label="Delete material"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                    <button
                      className="p-1 rounded-full border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-500 hover:text-blue-700 focus:outline-none transition"
                      title="Remarks"
                      aria-label="Remarks"
                      onClick={() => openRemarksModal(material)}
                    >
                      <MessageCircle size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        title="Delete Material"
        message="Are you sure you want to delete this material? This action cannot be undone."
        isDeleting={isDeletingMaterial}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteDialog(false);
          setMaterialToDelete(null);
        }}
      />

      <StockAdjustModal
        isOpen={showStockModal}
        mode={stockModalMode}
        materialName={selectedMaterial?.name || ''}
        unit={selectedMaterial?.unit || ''}
        isProcessing={isStockProcessing}
        onConfirm={handleStockModalConfirm}
        onCancel={handleStockModalCancel}
      />

      {showRemarksModal && remarksMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={closeRemarksModal}
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="text-lg font-bold mb-4">Remarks for {remarksMaterial.name}</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Write Remarks</label>
              <textarea
                className="w-full border rounded p-2 min-h-[60px]"
                value={remarksInput}
                onChange={e => setRemarksInput(e.target.value)}
                placeholder="Enter remarks..."
                disabled={remarksLoading}
              />
              <button
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                onClick={handleSaveRemark}
                disabled={!remarksInput.trim() || remarksLoading}
              >
                {remarksLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="font-medium">View Remarks</span>
              <button
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                onClick={handleViewRemark}
                disabled={remarksLoading}
              >
                {remarksLoading ? 'Loading...' : 'View'}
              </button>
            </div>
            {remarksError && <div className="text-red-500 text-sm mb-2">{remarksError}</div>}
            {viewedRemark && (
              <div className="bg-gray-50 rounded p-3 mt-2">
                <div className="text-gray-800 whitespace-pre-line">{viewedRemark.description}</div>
                <div className="text-xs text-gray-500 mt-2">By {viewedRemark.username} on {formatDate(viewedRemark.created_at)?.date} at {formatDate(viewedRemark.created_at)?.time}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast/alert for feedback */}
      {message && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50">
          {message}
          <button className="ml-2 text-white font-bold" onClick={() => setMessage(null)}>&times;</button>
        </div>
      )}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg z-50">
          {error}
          <button className="ml-2 text-white font-bold" onClick={() => setError(null)}>&times;</button>
        </div>
      )}
    </>
  );
};

export default InventoryTable;