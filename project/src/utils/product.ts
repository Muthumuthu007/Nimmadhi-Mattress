import { Product, RawMaterial } from '../types';
import { calculateTotalCost } from './inventory';

export const createNewProduct = (
  name: string,
  dimensions: string,
  materials: RawMaterial[]
): Product => {
  const totalCost = calculateTotalCost(materials);
  
  return {
    id: `product-${Date.now()}`,
    name,
    dimensions,
    materials: materials.map(m => ({
      ...m,
      quantity: Number(m.quantity)
    })),
    totalCost
  };
};