import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ProductionForm } from '../components/ProductionForm';
import DeleteConfirmationDialog from '../components/DeleteConfirmationDialog';
import { AlterMaterialsModal } from '../components/AlterMaterialsModal';
import { useProducts } from '../contexts/ProductContext';
import { useInventory } from '../hooks/useInventory';
import { Package2, RefreshCw, Loader2, Search, Trash2, AlertCircle, ArrowUpDown, Settings, Download, ChevronDown, ChevronRight, ArrowUp } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { productionApi } from '../utils/productionApi';
import { ProductionListSkeleton } from '../components/skeletons/ProductionListSkeleton';
import { useFuzzySearch } from '../hooks/useFuzzySearch';
import { HighlightText } from '../utils/searchUtils';
import { ProductionExcelUpload } from '../components/ProductionExcelUpload';

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-8 right-8 p-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-full shadow-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all duration-300 z-50 animate-bounce"
      aria-label="Scroll to top"
    >
      <ArrowUp className="h-6 w-6" />
    </button>
  );
};

const Production = () => {
  const location = useLocation();
  const { products, fetchProducts, addProduct } = useProducts();
  console.log('Products in Production page:', products);
  const { refreshInventory } = useInventory();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Removed local searchQuery state in favor of hook
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [showAlterMaterialsModal, setShowAlterMaterialsModal] = useState(false);
  const [selectedProductForAlter, setSelectedProductForAlter] = useState<any>(null);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  // Initialize Fuzzy Search
  const { query, setQuery, filteredData: filteredProducts } = useFuzzySearch(products, ['name', 'id']);

  useEffect(() => {
    setIsLoading(true);
    fetchProducts().finally(() => setIsLoading(false));
  }, [location.pathname]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await fetchProducts();
      setSuccessMessage('Products refreshed successfully!');
    } catch (error) {
      setError('Failed to refresh products.');
    }
    setIsRefreshing(false);
  };

  const handleProductionComplete = async () => {
    await refreshInventory();
    await fetchProducts();
  };

  const handleDeleteClick = (productId: string) => {
    setProductToDelete(productId);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    setIsDeletingProduct(productToDelete);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await productionApi.deleteProduct(productToDelete);

      if (response.data && response.data.message && response.data.message.includes('deleted successfully')) {
        setSuccessMessage(`Product deleted successfully`);
        fetchProducts();
      } else {
        setError(response.data.message || 'Failed to delete product. Please try again.');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message || 'Failed to delete product. Please try again.');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsDeletingProduct(null);
      setShowDeleteDialog(false);
      setProductToDelete(null);
    }
  };

  const handleAlterMaterials = (product: any) => {
    setSelectedProductForAlter(product);
    setShowAlterMaterialsModal(true);
  };

  const handleAlterMaterialsSuccess = (updatedData?: any) => {
    if (updatedData && selectedProductForAlter) {
      const updatedProduct = {
        ...selectedProductForAlter,
        stockNeeded: updatedData.stock_needed || selectedProductForAlter.stockNeeded,
        materials: updatedData.stock_needed
          ? Object.entries(updatedData.stock_needed).map(([k, v]) => ({ materialName: k, quantity: Number(v) }))
          : selectedProductForAlter.materials,
        productionCostTotal: updatedData.production_cost_total ?? selectedProductForAlter.productionCostTotal,
        wastageAmount: updatedData.wastage_amount ?? selectedProductForAlter.wastageAmount,
        totalCost: updatedData.total_cost ?? selectedProductForAlter.totalCost,
        maxProduce: updatedData.max_produce ?? selectedProductForAlter.maxProduce,
        inventory: updatedData.inventory ?? selectedProductForAlter.inventory,
      };

      addProduct(updatedProduct);
    }

    // Refresh the products list to get updated data
    fetchProducts();
    setSuccessMessage('Product materials updated successfully!');
  };

  const handleAlterMaterialsClose = () => {
    setShowAlterMaterialsModal(false);
    setSelectedProductForAlter(null);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'maxProduce':
        comparison = a.maxProduce - b.maxProduce;
        break;
      case 'cost':
        comparison = a.productionCostTotal - b.productionCostTotal;
        break;
      case 'totalCost':
        comparison = a.totalCost - b.totalCost;
        break;
      case 'laborCost':
        comparison = (a.laborCost || 0) - (b.laborCost || 0);
        break;
      case 'wastage':
        comparison = (a.wastage || 0) - (b.wastage || 0);
        break;
      case 'date':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      default:
        comparison = 0;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });
  console.log('Sorted products:', sortedProducts);

  const handleDownloadExcel = () => {
    if (!products || products.length === 0) {
      alert('No products available to export');
      return;
    }

    try {
      const sheetData: any[][] = [];

      // Add header row
      sheetData.push(['PRODUCTION DETAILS REPORT']);
      sheetData.push(['Generated on:', new Date().toLocaleString()]);
      sheetData.push(['Total Products:', products.length]);
      sheetData.push([]); // Empty row

      products.forEach((product, index) => {
        // Product header row with styling
        sheetData.push([
          `PRODUCT ${index + 1}: ${product.name}`,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        sheetData.push([
          'Product ID:',
          product.id,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        sheetData.push([
          'Created At:',
          product.createdAt ? (typeof product.createdAt === 'string' ? product.createdAt : new Date(product.createdAt).toLocaleString()) : 'N/A',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        sheetData.push([]); // Empty row

        // Production Details Header
        sheetData.push([
          'PRODUCTION DETAILS',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        sheetData.push([
          'Max Produce (units)',
          'Original Max (units)',
          'Wastage (%)',
          'Wastage Amount (₹)',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        sheetData.push([
          product.maxProduce || 0,
          product.originalMaxProduce || 0,
          product.wastage || 0,
          Number(product.wastageAmount || 0).toFixed(2),
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        sheetData.push([]); // Empty row

        // Cost Details Header
        sheetData.push([
          'COST BREAKDOWN',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        sheetData.push([
          'Labor Cost (₹)',
          'Transport Cost (₹)',
          'Production Cost (₹)',
          'Other Cost (₹)',
          'Total Cost (₹)',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        const totalCost =
          Number(product.productionCostTotal || 0) +
          Number(product.laborCost || 0) +
          Number((product as any).transportCost ?? (product as any)["transport_cost"] ?? 0) +
          Number(product.wastageAmount || 0) +
          Number((product as any).otherCost || 0);

        sheetData.push([
          Number(product.laborCost || 0).toFixed(2),
          Number((product as any).transportCost ?? (product as any)["transport_cost"] ?? 0).toFixed(2),
          Number(product.productionCostTotal || 0).toFixed(2),
          Number((product as any).otherCost || 0).toFixed(2),
          totalCost.toFixed(2),
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        sheetData.push([]); // Empty row

        // Materials Required
        sheetData.push([
          'MATERIALS REQUIRED',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        sheetData.push([
          'Material Name',
          'Quantity (units)',
          'Group/Category',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        if (product.stockNeeded && Object.keys(product.stockNeeded).length > 0) {
          Object.entries(product.stockNeeded).forEach(([material, quantity]) => {
            sheetData.push([
              material,
              quantity,
              product.groupChain && product.groupChain[material] ? product.groupChain[material] : 'N/A',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              ''
            ]);
          });
        } else {
          sheetData.push([
            'No materials required',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            ''
          ]);
        }

        sheetData.push([]); // Empty row

        // Production Cost Breakdown by Material
        sheetData.push([
          'PRODUCTION COST BREAKDOWN BY MATERIAL',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        sheetData.push([
          'Material Name',
          'Cost (₹)',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ]);

        if (product.productionCostBreakdown && Object.keys(product.productionCostBreakdown).length > 0) {
          Object.entries(product.productionCostBreakdown).forEach(([material, cost]) => {
            sheetData.push([
              material,
              Number(cost).toFixed(2),
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              ''
            ]);
          });
        } else {
          sheetData.push([
            'No cost breakdown available',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            ''
          ]);
        }

        // Add separator between products
        sheetData.push([]);
        sheetData.push(['═══════════════════════════════════════════════════════════════════════════════════════════════']);
        sheetData.push([]);
      });

      // Create worksheet from data
      const ws = XLSX.utils.aoa_to_sheet(sheetData);

      // Set column widths
      ws['!cols'] = [
        { wch: 35 }, // Column A - wider for labels
        { wch: 20 }, // Column B
        { wch: 20 }, // Column C
        { wch: 20 }, // Column D
        { wch: 20 }, // Column E
        { wch: 15 }, // Column F
        { wch: 15 }, // Column G
        { wch: 15 }, // Column H
        { wch: 15 }, // Column I
        { wch: 15 }, // Column J
        { wch: 15 }  // Column K
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Production Details');

      // Generate filename with timestamp
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      const filename = `Production_Details_${timestamp}.xlsx`;

      // Write file
      XLSX.writeFile(wb, filename);

      setSuccessMessage(`Excel file "${filename}" downloaded successfully!`);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);

    } catch (error) {
      console.error('Error generating Excel file:', error);
      setError('Failed to generate Excel file. Please try again.');

      // Clear error message after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    }
  };

  if (isLoading || isRefreshing) {
    return <ProductionListSkeleton />;
  }



  return (
    <div className="space-y-6">
      {/* Header with enhanced gradient background */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 dark:from-purple-800 dark:via-indigo-800 dark:to-blue-800 rounded-2xl shadow-xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Production Management</h1>
            <p className="text-purple-100 dark:text-purple-200 text-sm md:text-base">Manage your products and production workflow</p>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto">
            <button
              onClick={handleDownloadExcel}
              className="flex items-center px-4 md:px-5 py-2.5 bg-white text-purple-600 dark:text-purple-700 rounded-xl font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 text-sm md:text-base whitespace-nowrap"
            >
              <Download className="h-5 w-5 mr-2" />
              Export Excel
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`flex items-center px-4 md:px-5 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-xl font-medium shadow-lg hover:bg-white/30 hover:shadow-xl hover:scale-105 transition-all duration-200 text-sm md:text-base whitespace-nowrap ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              {isRefreshing ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-5 w-5 mr-2" />
              )}
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <ProductionExcelUpload onUploadComplete={handleRefresh} />
          </div>
        </div>
      </div>

      {/* Alert Messages with enhanced styling */}
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 p-5 rounded-xl shadow-md animate-in slide-in-from-top duration-300">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-5 rounded-xl shadow-md animate-in slide-in-from-top duration-300">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Sort Section with enhanced card design */}
      <div className="bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-900/20 rounded-2xl shadow-xl p-5 md:p-6 border-2 border-purple-200 dark:border-gray-700">
        <div className="flex flex-col gap-4">
          <div className="relative flex-grow w-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-purple-400 dark:text-purple-500" />
            </div>
            <input
              type="text"
              placeholder="Search products by name or ID..."
              className="pl-12 pr-4 py-3 w-full border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 transition-all duration-200 bg-white dark:bg-gray-700 hover:shadow-md text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300 shadow-sm"
              value={query} // Updated to use query from hook
              onChange={(e) => setQuery(e.target.value)} // Updated to use setQuery from hook
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sort by:</span>
            <div className="relative flex-1 min-w-[200px]">
              <select
                className="appearance-none w-full bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl py-3 pl-4 pr-12 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 dark:focus:border-purple-400 transition-all duration-200 cursor-pointer hover:border-purple-300 dark:hover:border-purple-500 shadow-sm hover:shadow-md"
                value={sortField}
                onChange={(e) => handleSort(e.target.value)}
                aria-label="Sort products by"
              >
                <option value="name" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Product Name</option>
                <option value="maxProduce" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Max Produce</option>
                <option value="cost" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Production Cost</option>
                <option value="totalCost" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Total Cost</option>
                <option value="laborCost" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Labor Cost</option>
                <option value="wastage" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Wastage %</option>
                <option value="date" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Date Created</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                <ArrowUpDown className="h-4 w-4 text-purple-400 dark:text-purple-500" />
              </div>
            </div>

            <button
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-300 dark:hover:border-purple-500 transition-all duration-200 font-bold text-lg text-purple-600 dark:text-purple-400 shadow-sm hover:shadow-md hover:scale-110"
              title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
        <div className="lg:col-span-2 order-2 lg:order-1">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center">
                <Package2 className="h-5 w-5 md:h-6 md:w-6 mr-2 md:mr-3 text-indigo-600 dark:text-indigo-400" />
                Available Products
              </h2>
              <div className="bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 text-indigo-800 dark:text-indigo-300 px-3 md:px-4 py-1.5 md:py-2 rounded-xl shadow-sm text-xs md:text-sm font-bold">
                {sortedProducts.length} Product{sortedProducts.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="space-y-6">
              {sortedProducts.length > 0 ? (
                sortedProducts.map(product => {
                  const isExpanded = expandedProductId === product.id;
                  return (
                    <div
                      key={product.id}
                      className={`border-2 rounded-2xl p-4 md:p-6 transition-all duration-300 ${isExpanded
                        ? 'border-indigo-400 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 shadow-xl'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-lg'
                        }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                        <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                          <button
                            onClick={() => setExpandedProductId(isExpanded ? null : product.id)}
                            className={`flex-shrink-0 p-2 rounded-xl transition-all duration-200 ${isExpanded
                              ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                              : 'bg-gray-100 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-600 dark:text-gray-300'
                              }`}
                            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5" />
                            ) : (
                              <ChevronRight className="h-5 w-5" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            {/* Updated with HighlightText */}
                            <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white break-words">
                              <HighlightText text={product.name} highlight={query} matches={product.matches} />
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                              {/* Updated with HighlightText */}
                              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 break-all">ID: <span className="font-mono font-medium">
                                <HighlightText text={product.id} highlight={query} matches={product.matches} />
                              </span></p>
                              <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">•</span>
                              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{format(new Date(product.createdAt), 'PPp')}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                          <div className="flex-1 sm:flex-initial text-left sm:text-right">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Total Cost</div>
                            <div className="text-lg sm:text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                              ₹{Number(product.totalCost || (
                                Number(product.productionCostTotal) +
                                Number(product.laborCost || 0) +
                                Number(product.transportCost || 0) +
                                Number(product.wastageAmount || 0) +
                                Number((product as any).otherCost || 0)
                              )).toFixed(2)}
                            </div>
                          </div>
                          <button
                            onClick={() => handleAlterMaterials(product)}
                            className="flex-shrink-0 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 p-2 sm:p-3 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all duration-200 shadow-sm hover:shadow-md"
                            title="Alter Materials"
                          >
                            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(product.id)}
                            disabled={isDeletingProduct === product.id}
                            className={`flex-shrink-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-2 sm:p-3 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200 shadow-sm hover:shadow-md ${isDeletingProduct === product.id ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            title="Delete Product"
                          >
                            {isDeletingProduct === product.id ? (
                              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                            )}
                          </button>
                        </div>
                      </div>
                      {isExpanded && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl p-3 md:p-4 border border-indigo-200 dark:border-indigo-800">
                              <div className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-3 flex items-center">
                                <Package2 className="h-4 w-4 mr-2" />
                                Production Status
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs sm:text-sm gap-2">
                                  <span className="text-indigo-700 dark:text-indigo-400">Max Produce:</span>
                                  <span className="font-bold text-indigo-900 dark:text-indigo-200 text-right">{product.maxProduce} units</span>
                                </div>
                                <div className="flex justify-between text-xs sm:text-sm gap-2">
                                  <span className="text-indigo-700 dark:text-indigo-400">Original Max:</span>
                                  <span className="font-bold text-indigo-900 dark:text-indigo-200 text-right">{product.originalMaxProduce} units</span>
                                </div>
                                <div className="flex justify-between text-xs sm:text-sm gap-2">
                                  <span className="text-indigo-700 dark:text-indigo-400">Wastage:</span>
                                  <span className="font-bold text-indigo-900 dark:text-indigo-200 text-right">{product.wastage}% (₹{Number(product.wastageAmount || 0).toFixed(2)})</span>
                                </div>
                              </div>
                            </div>
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-3 md:p-4 border border-purple-200 dark:border-purple-800">
                              <div className="text-sm font-bold text-purple-900 dark:text-purple-300 mb-3">Cost Breakdown</div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-xs sm:text-sm gap-2">
                                  <span className="text-purple-700 dark:text-purple-400 break-words">Labor Cost (per unit):</span>
                                  <span className="font-bold text-purple-900 dark:text-purple-200 text-right flex-shrink-0">₹{Number(product.laborCost).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs sm:text-sm gap-2">
                                  <span className="text-purple-700 dark:text-purple-400 break-words">Transport Cost (per unit):</span>
                                  <span className="font-bold text-purple-900 dark:text-purple-200 text-right flex-shrink-0">₹{Number((product as any).transportCost ?? (product as any)["transport_cost"] ?? 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs sm:text-sm gap-2">
                                  <span className="text-purple-700 dark:text-purple-400 break-words">Production Cost:</span>
                                  <span className="font-bold text-purple-900 dark:text-purple-200 text-right flex-shrink-0">₹{Number(product.productionCostTotal).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs sm:text-sm pt-2 border-t border-purple-300 dark:border-purple-700 gap-2">
                                  <span className="text-purple-700 dark:text-purple-400 font-bold break-words">Total Cost:</span>
                                  <span className="font-bold text-purple-900 dark:text-purple-200 text-right flex-shrink-0">₹{Number(product.totalCost || (
                                    Number(product.productionCostTotal) +
                                    Number(product.laborCost || 0) +
                                    Number(product.transportCost || 0) +
                                    Number(product.wastageAmount || 0) +
                                    Number((product as any).otherCost || 0)
                                  )).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4 transition-colors duration-300">
                            <div className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Materials Required</div>
                            <div className="space-y-2">
                              {Object.entries(product.stockNeeded ?? {}).map(([material, quantity]) => (
                                <div key={material} className="flex justify-between items-start gap-2 text-gray-900 dark:text-gray-200">
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs sm:text-sm font-medium break-words">{material}</span>
                                    {product.groupChain[material] && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 break-words">({product.groupChain[material]})</span>
                                    )}
                                  </div>
                                  <span className="text-xs sm:text-sm font-medium flex-shrink-0 text-right">{String(quantity)} units</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Production Cost Breakdown</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-900 dark:text-gray-200">
                              {Object.entries(product.productionCostBreakdown ?? {}).map(([material, cost]) => (
                                <div key={material} className="flex justify-between gap-2">
                                  <span className="break-words">{material}:</span>
                                  <span className="font-medium flex-shrink-0 text-right">₹{Number(cost).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {query ? 'No products match your search' : 'No products available'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <ProductionForm
            products={products}
            onProductionComplete={handleProductionComplete}
          />
        </div>
      </div>
      <ScrollToTop />

      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        isDeleting={Boolean(isDeletingProduct)}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteDialog(false);
          setProductToDelete(null);
        }}
      />

      {selectedProductForAlter && (
        <AlterMaterialsModal
          product={selectedProductForAlter}
          isOpen={showAlterMaterialsModal}
          onClose={handleAlterMaterialsClose}
          onSuccess={handleAlterMaterialsSuccess}
        />
      )}
    </div>
  );
};

export default Production;