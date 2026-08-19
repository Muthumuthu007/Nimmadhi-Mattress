import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { Product, ProductGroupSection } from '../types';
import { apiClient } from '../utils/api';
import { ProductionListResponse } from '../utils/productionApi';
import { useAuth } from '../contexts/AuthContext';

interface ProductContextType {
  products: Product[];
  groupedProducts: ProductGroupSection[];
  addProduct: (product: Product) => void;
  clearProducts: () => void;
  fetchProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

// Maps a single raw product object (as returned by the API, whether flat or
// nested inside a grouped_products section) into the app's Product shape.
// Kept as a standalone function so both the flat and grouped response paths
// share identical mapping logic.
const mapRawProduct = (
  product: any,
  groupOverride?: { groupId: string | null; groupName: string }
): Product => {
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
    // Surfaced for the Dashboard's product details modal; defaults to 0 rather
    // than NaN when the API omits it.
    inventory: Number(product.inventory ?? 0),
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
    otherCost: Number(product.other_cost ?? 0),
    groupId: groupOverride ? groupOverride.groupId : (product.group_id ?? null),
    groupName: groupOverride ? groupOverride.groupName : (product.group_name ?? null),
  } as Product;
};

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [groupedProducts, setGroupedProducts] = useState<ProductGroupSection[]>([]);
  const { user, isAuthenticated } = useAuth();

  const fetchProducts = useCallback(async () => {
    if (!isAuthenticated || !user || !user.username) return;

    try {
      // GET /api/production/list/ — returns ProductionListResponse with grouped_products
      const response = await apiClient.get<ProductionListResponse>('/api/production/list/');

      const data = response.data;

      // Primary path: consume grouped_products from the new endpoint
      const groupedRaw = data?.grouped_products;

      if (Array.isArray(groupedRaw)) {
        const sections: ProductGroupSection[] = groupedRaw.map((section) => {
          const groupId = section.group_id ?? null;
          const groupName = section.group_name ?? (groupId === null ? 'Ungrouped' : 'Unknown Group');
          const sectionProducts = Array.isArray(section.products)
            ? section.products.map((p) => mapRawProduct(p, { groupId, groupName }))
            : [];

          return {
            groupId,
            groupName,
            productCount: Number(section.product_count ?? sectionProducts.length),
            products: sectionProducts,
          };
        });

        setGroupedProducts(sections);
        // Flat list kept for consumers that still need an ungrouped array
        // (e.g. the production-run dropdown, Excel export).
        setProducts(sections.flatMap(s => s.products));
        return;
      }

      // Fallback: legacy flat array response (backward compatibility if endpoint
      // changes or during local development returning a different shape)
      const productsArray = Array.isArray(data)
        ? data
        : (data as any).products || (data as any).all_products || [];

      if (productsArray.length > 0) {
        const updatedProducts = productsArray.map((product: any) => mapRawProduct(product));
        setProducts(updatedProducts);

        // Synthesize grouped sections from each product's own group metadata
        const byGroup = new Map<string, ProductGroupSection>();
        updatedProducts.forEach((product: Product) => {
          const groupId = product.groupId ?? null;
          const groupName = product.groupName ?? 'Ungrouped';
          const key = groupId ?? '__ungrouped__';
          if (!byGroup.has(key)) {
            byGroup.set(key, { groupId, groupName, productCount: 0, products: [] });
          }
          const section = byGroup.get(key)!;
          section.products.push(product);
          section.productCount = section.products.length;
        });
        setGroupedProducts(Array.from(byGroup.values()));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      // Re-thrown so callers (Production page, Dashboard) can surface their own
      // error UI. The provider's own effect below swallows it deliberately.
      throw error;
    }
  }, [isAuthenticated, user?.username]);

  useEffect(() => {
    if (isAuthenticated && user?.username) {
      // Already logged inside fetchProducts; ignored here so a failed
      // background load never becomes an unhandled rejection.
      fetchProducts().catch(() => undefined);
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

    setGroupedProducts(prev => {
      const groupId = product.groupId ?? null;
      const key = groupId ?? '__ungrouped__';
      const existingSectionIndex = prev.findIndex(
        s => (s.groupId ?? '__ungrouped__') === key
      );

      // Remove the product from any other section first (in case its group changed)
      const withoutProduct = prev.map(section => ({
        ...section,
        products: section.products.filter(p => p.id !== product.id),
      }));

      if (existingSectionIndex >= 0) {
        return withoutProduct.map(section => {
          if ((section.groupId ?? '__ungrouped__') !== key) return section;
          const nextProducts = [...section.products.filter(p => p.id !== product.id), product];
          return { ...section, products: nextProducts, productCount: nextProducts.length };
        });
      }

      return [
        ...withoutProduct,
        {
          groupId,
          groupName: product.groupName ?? 'Ungrouped',
          productCount: 1,
          products: [product],
        },
      ];
    });
  }, []);

  const clearProducts = useCallback(() => {
    setProducts([]);
    setGroupedProducts([]);
  }, []);

  const value = useMemo(
    () => ({ products, groupedProducts, addProduct, clearProducts, fetchProducts }),
    [products, groupedProducts, addProduct, clearProducts, fetchProducts]
  );

  return (
    <ProductContext.Provider value={value}>
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