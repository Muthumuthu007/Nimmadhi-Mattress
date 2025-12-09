import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Product } from '../types';
import { apiClient } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

interface ProductContextType {
  products: Product[];
  addProduct: (product: Product) => void;
  clearProducts: () => void;
  fetchProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const { user, isAuthenticated } = useAuth();

  const fetchProducts = useCallback(async () => {
    if (!isAuthenticated || !user || !user.username) return;

    try {
      // Use the new REST API endpoint with POST method and username payload
      const response = await apiClient.post('/api/stock/products/list/', {
        username: user.username
      });
      console.log('Fetched products response:', response.data);

      // Handle the response - it should be an array of products
      const productsArray = Array.isArray(response.data)
        ? response.data
        : response.data.products || response.data.data?.products || [];

      if (productsArray.length > 0) {
        const updatedProducts = productsArray.map((product: any) => {
          // Map materials array to stockNeeded and groupChain
          const stockNeeded: Record<string, number> = {};
          const groupChain: Record<string, string[]> = {};

          // Use the new 'materials' field if available, otherwise fall back to 'stock_details'
          const materialsData = product.materials || product.stock_details || [];

          if (Array.isArray(materialsData)) {
            materialsData.forEach((item: any) => {
              // Use item_name as the key for the new structure
              const materialKey = item.item_name || item.item_id;
              const materialQty = item.quantity || item.required_qty;

              stockNeeded[materialKey] = materialQty;
              groupChain[materialKey] = item.group_chain || [];
            });
          }

          // Also map stock_needed if available (for backward compatibility)
          if (product.stock_needed && typeof product.stock_needed === 'object') {
            Object.entries(product.stock_needed).forEach(([material, quantity]) => {
              if (!stockNeeded[material]) {
                stockNeeded[material] = Number(quantity);
              }
            });
          }

          return {
            id: product.product_id,
            name: product.product_name,
            maxProduce: Number(product.max_produce),
            originalMaxProduce: Number(product.original_max_produce),
            productionCostTotal: Number(product.production_cost_total),
            productionCostBreakdown: product.production_cost_breakdown,
            stockNeeded,
            createdAt: product.created_at,
            materials: Array.isArray(materialsData)
              ? materialsData.map((item: any) => ({
                materialName: item.item_name || item.item_id,
                quantity: item.quantity || item.required_qty
              }))
              : [],
            wastage: Number(product.wastage_percent || 0),
            wastageAmount: Number(product.wastage_amount || 0),
            laborCost: Number(product.labour_cost || 0),
            totalCost: Number(product.total_cost || 0),
            groupChain,
            transportCost: Number(product.transport_cost ?? 0),
            otherCost: Number(product.other_cost ?? 0)
          };
        });
        setProducts(updatedProducts);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      // Optionally handle error
    }
  }, [isAuthenticated, user?.username]);

  useEffect(() => {
    if (isAuthenticated && user?.username) {
      fetchProducts();
    }
  }, [isAuthenticated, user?.username, fetchProducts]);

  const addProduct = useCallback((product: Product) => {
    setProducts(prev => {
      // Check if product already exists
      const exists = prev.some(p => p.id === product.id);
      if (exists) {
        // Update existing product
        return prev.map(p => p.id === product.id ? product : p);
      }
      // Add new product
      return [...prev, product];
    });
  }, []);

  const clearProducts = useCallback(() => {
    setProducts([]);
  }, []);

  return (
    <ProductContext.Provider value={{ products, addProduct, clearProducts, fetchProducts }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};