import { useState, useCallback, useEffect } from 'react';
import { Product } from '../types';
import { makeApiRequest } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const { user } = useAuth();

  const fetchProducts = useCallback(async () => {
    if (!user || !user.username) return;
    const payload = {
      operation: 'GetAllProducts',
      username: user.username
    };
    console.log('Payload for GetAllProducts:', payload);
    try {
      const response = await makeApiRequest(payload);
      console.log('Fetched products response:', response);
      if (response) {
        setProducts(response);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  }, [user?.username]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const addProduct = useCallback((product: Product) => {
    setProducts(prevProducts => [...prevProducts, product]);
  }, []);

  return {
    products,
    addProduct,
    setProducts,
    fetchProducts
  };
};