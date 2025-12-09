import React from 'react';
import { Plus } from 'lucide-react';

interface InventoryActionsProps {
  onNewMaterial: () => void;
  onNewProduct: () => void;
}

export const InventoryActions: React.FC<InventoryActionsProps> = ({
  onNewMaterial,
  onNewProduct
}) => {
  return (
    <div className="flex justify-end space-x-4 mb-4">
      <button
        onClick={onNewMaterial}
        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Raw Material
      </button>
      <button
        onClick={onNewProduct}
        className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-300"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create New Product
      </button>
    </div>
  );
};