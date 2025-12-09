import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { InventoryTable } from './components/InventoryTable';
import { ProductionForm } from './components/ProductionForm';
import { NewMaterialForm } from './components/NewMaterialForm';
import { NewProductForm } from './components/NewProductForm';
import { InventoryActions } from './components/InventoryActions';
import { StockAlerts } from './components/StockAlerts';
import { ProductionSummaryView } from './components/ProductionSummary';
import { products as initialProducts } from './data/products';
import { Product, RawMaterial, StockAlert, ProductionSummary } from './types';
import { validateMaterialsAvailability } from './utils/inventory';
import { checkStockAlerts, calculatePossibleProduction } from './utils/stockMonitoring';

function App() {
  const [inventory, setInventory] = useState<RawMaterial[]>(
    initialProducts.flatMap(p => p.materials)
  );
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showNewMaterial, setShowNewMaterial] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [productionSummaries, setProductionSummaries] = useState<ProductionSummary[]>([]);

  useEffect(() => {
    setStockAlerts(checkStockAlerts(inventory));
    setProductionSummaries(
      products.map(product => calculatePossibleProduction(product, inventory))
    );
  }, [inventory, products]);

  const handleUpdateStock = (materialId: string, quantity: number) => {
    setInventory(prev =>
      prev.map(material =>
        material.id === materialId
          ? { ...material, available: material.available + quantity }
          : material
      )
    );
  };

  const handleUpdateStockLimit = (materialId: string, limit: number) => {
    setInventory(prev =>
      prev.map(material =>
        material.id === materialId
          ? { ...material, minStockLimit: limit }
          : material
      )
    );
  };

  const handleAddMaterial = (material: RawMaterial) => {
    setInventory(prev => [...prev, material]);
  };

  const handleAddProduct = (product: Product) => {
    setProducts(prev => [...prev, product]);
  };

  const handleProduceMattress = (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (!validateMaterialsAvailability(product.materials, inventory, quantity)) {
      alert('Not enough materials in stock!');
      return;
    }

    setInventory(prev =>
      prev.map(inventoryMaterial => {
        const productMaterial = product.materials.find(
          m => m.id === inventoryMaterial.id
        );
        if (!productMaterial) return inventoryMaterial;

        return {
          ...inventoryMaterial,
          available: inventoryMaterial.available - (productMaterial.quantity * quantity)
        };
      })
    );

    alert(`Successfully produced ${quantity} ${product.name} ${product.dimensions}`);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="container mx-auto py-8 px-4">
        <StockAlerts alerts={stockAlerts} />
        <InventoryActions
          onNewMaterial={() => setShowNewMaterial(true)}
          onNewProduct={() => setShowNewProduct(true)}
        />
        <ProductionSummaryView summaries={productionSummaries} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-4">Raw Materials Inventory</h2>
            <InventoryTable
              materials={inventory}
              onUpdateStock={handleUpdateStock}
              onUpdateStockLimit={handleUpdateStockLimit}
            />
          </div>
          <div>
            <ProductionForm
              products={products}
              onProduceMattress={handleProduceMattress}
            />
          </div>
        </div>
      </main>

      {showNewMaterial && (
        <NewMaterialForm
          inventory={inventory}
          onAddMaterial={handleAddMaterial}
          onClose={() => setShowNewMaterial(false)}
        />
      )}

      {showNewProduct && (
        <NewProductForm
          inventory={inventory}
          onAddProduct={handleAddProduct}
          onClose={() => setShowNewProduct(false)}
        />
      )}
    </div>
  );
}

export default App;