import { RawMaterial, StockAlert, Product, ProductionSummary } from '../types';

export const checkStockAlerts = (materials: RawMaterial[]): StockAlert[] => {
  return materials
    .filter(material => 
      material.minStockLimit !== undefined && 
      material.available <= material.minStockLimit
    )
    .map(material => ({
      materialId: material.id,
      materialName: material.name,
      available: material.available,
      minStockLimit: material.minStockLimit!
    }));
};

export const calculatePossibleProduction = (
  product: Product,
  inventory: RawMaterial[]
): ProductionSummary => {
  const materialLimits = product.materials.map(required => {
    const inStock = inventory.find(m => m.id === required.id);
    if (!inStock) return 0;
    return Math.floor(inStock.available / required.quantity);
  });

  const possibleUnits = Math.min(...materialLimits);
  
  const limitingMaterials = product.materials
    .filter((_, index) => materialLimits[index] === possibleUnits)
    .map(m => m.name);

  return {
    productId: product.id,
    name: product.name,
    dimensions: product.dimensions,
    possibleUnits,
    limitingMaterials
  };
};