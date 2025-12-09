import { RawMaterial, Product } from '../types';

export const calculateTotalCost = (materials: RawMaterial[]): number => {
  return materials.reduce((total, material) => total + material.cost * material.quantity, 0);
};

export const validateMaterialsAvailability = (
  requiredMaterials: RawMaterial[],
  inventory: RawMaterial[],
  quantity: number = 1
): boolean => {
  return requiredMaterials.every(material => {
    const inventoryMaterial = inventory.find(m => m.id === material.id);
    return inventoryMaterial && 
           inventoryMaterial.available >= material.quantity * quantity;
  });
};

export const generateMaterialId = (inventory: RawMaterial[]): string => {
  const existingIds = inventory.map(m => parseInt(m.id.replace('m', '')));
  const maxId = Math.max(...existingIds, 0);
  return `m${maxId + 1}`;
};