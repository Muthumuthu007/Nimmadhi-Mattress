import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Maximize2, Minimize2 } from 'lucide-react';

interface NewMaterialFormProps {
  inventory: any[];
  onAddMaterial: (material: any) => void;
  onClose: () => void;
}

export const NewMaterialForm: React.FC<NewMaterialFormProps> = ({
  onAddMaterial,
  onClose
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [material, setMaterial] = useState({
    name: '',
    quantity: '',
    defective: '',
    cost_per_unit: '',
    gst: '',
    stock_limit: '',
    unit: '',
    username: 'alice' // Using the same username as in the example
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Format the material data according to the API requirements
      const newMaterial = {
        operation: 'CreateStock',
        name: material.name,
        quantity: Number(material.quantity),
        defective: Number(material.defective),
        cost_per_unit: Number(material.cost_per_unit),
        gst: Number(material.gst),
        stock_limit: Number(material.stock_limit),
        unit: material.unit,
        username: material.username
      };

      await onAddMaterial(newMaterial);
      setSuccess(`Material '${material.name}' added successfully!`);

      // Reset form
      setMaterial({
        name: '',
        quantity: '',
        defective: '',
        cost_per_unit: '',
        gst: '',
        stock_limit: '',
        unit: '',
        username: 'alice'
      });

      // Close after a delay to show success message
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error: any) {
      setError(error?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-all duration-300 ${isMaximized ? 'p-0' : 'p-4'}`}>
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg overflow-hidden flex flex-col transition-all duration-300 
          ${isMaximized
            ? 'w-full h-full max-w-none max-h-none rounded-none'
            : 'w-full max-w-md max-h-[90vh] overflow-y-auto'
          }`}
      >
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Raw Material</h2>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setIsMaximized(prev => !prev)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-500 dark:text-gray-400"
              aria-label={isMaximized ? "Minimize" : "Maximize"}
            >
              {isMaximized ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-500 dark:text-gray-400"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <p>{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="material-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Material Name</label>
                <input
                  id="material-name"
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={material.name}
                  onChange={e => setMaterial(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <label htmlFor="material-unit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit</label>
                <input
                  id="material-unit"
                  type="text"
                  required
                  placeholder="e.g., kg, mtr, pc"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300"
                  value={material.unit}
                  onChange={e => setMaterial(prev => ({ ...prev, unit: e.target.value }))}
                />
              </div>

              <div>
                <label htmlFor="material-quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
                <input
                  id="material-quantity"
                  type="number"
                  min="0"
                  step="1"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={material.quantity}
                  onChange={e => setMaterial(prev => ({ ...prev, quantity: e.target.value }))}
                />
              </div>

              <div>
                <label htmlFor="material-defective" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Defective Quantity</label>
                <input
                  id="material-defective"
                  type="number"
                  min="0"
                  step="1"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={material.defective}
                  onChange={e => setMaterial(prev => ({ ...prev, defective: e.target.value }))}
                />
              </div>

              <div>
                <label htmlFor="material-cost" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cost per Unit</label>
                <input
                  id="material-cost"
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={material.cost_per_unit}
                  onChange={e => setMaterial(prev => ({ ...prev, cost_per_unit: e.target.value }))}
                />
              </div>

              <div>
                <label htmlFor="material-gst" className="block text-sm font-medium text-gray-700 dark:text-gray-300">GST (%)</label>
                <input
                  id="material-gst"
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={material.gst}
                  onChange={e => setMaterial(prev => ({ ...prev, gst: e.target.value }))}
                />
              </div>

              <div>
                <label htmlFor="material-stock-limit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Stock Limit</label>
                <input
                  id="material-stock-limit"
                  type="number"
                  min="0"
                  step="1"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={material.stock_limit}
                  onChange={e => setMaterial(prev => ({ ...prev, stock_limit: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isLoading ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
              >
                {isLoading ? 'Adding...' : 'Add Material'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};