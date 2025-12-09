import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { makeApiRequest } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const AddMaterial = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    defective: '',
    cost_per_unit: '',
    stock_limit: '',
    unit: '',
    group_id: ''
  });
  const [errors, setErrors] = useState({
    name: '',
    quantity: '',
    defective: '',
    cost_per_unit: '',
    stock_limit: '',
    unit: '',
    group_id: '',
    auth: ''
  });

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      name: '',
      quantity: '',
      defective: '',
      cost_per_unit: '',
      stock_limit: '',
      unit: '',
      group_id: '',
      auth: ''
    };

    if (!formData.name) {
      newErrors.name = 'Material name is required';
      isValid = false;
    }

    if (!formData.quantity) {
      newErrors.quantity = 'Quantity is required';
      isValid = false;
    } else if (formData.quantity !== '' && (isNaN(Number(formData.quantity)) || Number(formData.quantity) < 0)) {
      newErrors.quantity = 'Quantity must be a positive number';
      isValid = false;
    }

    if (!formData.defective) {
      newErrors.defective = 'Defective quantity is required';
      isValid = false;
    } else if (formData.defective !== '' && (isNaN(Number(formData.defective)) || Number(formData.defective) < 0)) {
      newErrors.defective = 'Defective quantity must be a positive number';
      isValid = false;
    }

    if (!formData.cost_per_unit) {
      newErrors.cost_per_unit = 'Cost per unit is required';
      isValid = false;
    } else if (formData.cost_per_unit !== '' && (isNaN(Number(formData.cost_per_unit)) || Number(formData.cost_per_unit) <= 0)) {
      newErrors.cost_per_unit = 'Cost per unit must be a positive number';
      isValid = false;
    }

    if (!formData.stock_limit) {
      newErrors.stock_limit = 'Stock limit is required';
      isValid = false;
    } else if (formData.stock_limit !== '' && (isNaN(Number(formData.stock_limit)) || Number(formData.stock_limit) <= 0)) {
      newErrors.stock_limit = 'Stock limit must be a positive number';
      isValid = false;
    }

    if (!formData.unit) {
      newErrors.unit = 'Unit is required';
      isValid = false;
    }

    if (!formData.group_id) {
      newErrors.group_id = 'Group ID is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors(prev => ({ ...prev, auth: '' }));

    try {
      const payload = {
        operation: 'CreateStock',
        name: formData.name,
        quantity: Number(formData.quantity) || 0,
        defective: Number(formData.defective) || 0,
        cost_per_unit: Number(formData.cost_per_unit) || 0,
        stock_limit: Number(formData.stock_limit) || 0,
        username: user.username,
        unit: formData.unit,
        group_id: formData.group_id
      };

      const response = await makeApiRequest(payload);

      if (response?.message?.toLowerCase().includes('successfully')) {
        navigate('/materials', { 
          state: { message: 'Material added successfully!' }
        });
      } else {
        setErrors(prev => ({
          ...prev,
          auth: response?.message || 'Failed to add material. Please try again.'
        }));
      }
    } catch (error: any) {
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (error?.response?.data) {
        errorMessage = error.response.data.message || 'Failed to add material. Please try again.';
      }
      
      setErrors(prev => ({ ...prev, auth: errorMessage }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Add New Material
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {errors.auth && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-600">{errors.auth}</p>
            </div>
          )}
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Material Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                Quantity
              </label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                min="0"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
              {errors.quantity && (
                <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
              )}
            </div>

            <div>
              <label htmlFor="defective" className="block text-sm font-medium text-gray-700">
                Defective Quantity
              </label>
              <input
                id="defective"
                name="defective"
                type="number"
                min="0"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={formData.defective}
                onChange={(e) => setFormData({ ...formData, defective: e.target.value })}
              />
              {errors.defective && (
                <p className="mt-1 text-sm text-red-600">{errors.defective}</p>
              )}
            </div>

            <div>
              <label htmlFor="cost_per_unit" className="block text-sm font-medium text-gray-700">
                Cost per Unit
              </label>
              <input
                id="cost_per_unit"
                name="cost_per_unit"
                type="number"
                min="0.01"
                step="0.01"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={formData.cost_per_unit}
                onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })}
              />
              {errors.cost_per_unit && (
                <p className="mt-1 text-sm text-red-600">{errors.cost_per_unit}</p>
              )}
            </div>

            <div>
              <label htmlFor="stock_limit" className="block text-sm font-medium text-gray-700">
                Stock Limit
              </label>
              <input
                id="stock_limit"
                name="stock_limit"
                type="number"
                min="1"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={formData.stock_limit}
                onChange={(e) => setFormData({ ...formData, stock_limit: e.target.value })}
              />
              {errors.stock_limit && (
                <p className="mt-1 text-sm text-red-600">{errors.stock_limit}</p>
              )}
            </div>

            <div>
              <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
                Unit
              </label>
              <input
                id="unit"
                name="unit"
                type="text"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
              {errors.unit && (
                <p className="mt-1 text-sm text-red-600">{errors.unit}</p>
              )}
            </div>

            <div>
              <label htmlFor="group_id" className="block text-sm font-medium text-gray-700">
                Group ID
              </label>
              <input
                id="group_id"
                name="group_id"
                type="text"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={formData.group_id}
                onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
              />
              {errors.group_id && (
                <p className="mt-1 text-sm text-red-600">{errors.group_id}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                isLoading ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <PlusCircle className="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" />
              </span>
              {isLoading ? 'Adding Material...' : 'Add Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMaterial; 