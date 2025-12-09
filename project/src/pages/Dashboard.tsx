import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  lazy,
  Suspense,
} from "react";
import {
  Package2,
  Bed,
  AlertTriangle,
  Search,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronRight,
  Download,
  TrendingUp,
  Package,
  Calendar,
  ArrowRight,
  TrendingDown,
  DollarSign,
  Activity,
  Box,
  AlertCircle,
  Truck,
  Filter,
  X,
} from "lucide-react";

import { FixedSizeList } from 'react-window';
import AutoSizer from "react-virtualized-auto-sizer";

import * as XLSX from "xlsx";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { useLocation } from 'react-router-dom';
import { useInventory } from '../hooks/useInventory';
import { useProducts } from '../contexts/ProductContext';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';

import { StatsCard } from "../components/dashboard/StatsCard";
import { DashboardProductCard } from "../components/dashboard/DashboardProductCard";
import { DashboardSkeleton } from "../components/skeletons/DashboardSkeleton";
import { Product } from "../types";
import { apiClient } from "../utils/api";
import { checkStockAlerts } from "../utils/stockMonitoring";
import { useAuth } from "../contexts/AuthContext";

const ProductDetailsModal = lazy(() =>
  import("../components/dashboard/ProductDetailsModal").then((m) => ({
    default: m.ProductDetailsModal,
  }))
);

interface ApiProduct {
  product_id: string;
  product_name: string;
  inventory: string | number;
  max_produce: string | number;
  original_max_produce: string | number;
  production_cost_total: string | number;
  production_cost_breakdown: { [key: string]: string | number };
  stock_needed: { [key: string]: string | number };
  created_at: string;
  wastage_amount: string | number;
  wastage_percent: string | number;
  labour_cost: string | number;
  transport_cost: string | number;
  other_cost: string | number;
  total_cost: string | number;
}

// --- Types ---
interface MonthlySummary {
  production_count: number;
  revenue: number;
  top_products: Array<{ name: string; value: number }>;
}

interface ProductDetails {
  id: string;
  name: string;
  sku: string;
  category: string;
  stockLevel: number;
  minStockLevel: number;
  price: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  lastUpdated: string;
  materials: Array<{ name: string; quantity: number }>; // Added for material details
}

const Dashboard = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("name");

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [lowStockCount, setLowStockCount] = useState(0);
  const [rawMaterialsCount, setRawMaterialsCount] = useState(0);
  const [allRawMaterials, setAllRawMaterials] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);

  const [monthlySummary, setMonthlySummary] = useState<any>(null);
  const [monthlyExpanded, setMonthlyExpanded] = useState(false);
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);

  // ---------------------------------------------
  // FETCH RAW MATERIALS
  // ---------------------------------------------
  const fetchLowStockAndRawMaterials = useCallback(async () => {
    try {
      // Use fetchAllStocks to get complete hierarchical data
      const { fetchAllStocks } = await import('../utils/inventoryApi');
      const groupsData = await fetchAllStocks(user.username);

      // Recursively flatten all materials from all groups and subgroups
      const flattenMaterials = (groups: any[]): any[] => {
        let allMaterials: any[] = [];

        for (const group of groups) {
          // Add materials from current group
          if (group.items && Array.isArray(group.items)) {
            allMaterials = allMaterials.concat(group.items);
          }

          // Recursively add materials from subgroups
          if (group.subgroups && Array.isArray(group.subgroups)) {
            allMaterials = allMaterials.concat(flattenMaterials(group.subgroups));
          }
        }

        return allMaterials;
      };

      const inventoryArray = flattenMaterials(groupsData);
      setRawMaterialsCount(inventoryArray.length);

      const materials = inventoryArray.map((item: any) => ({
        id: item.item_id,
        name: item.name,
        available: Number(item.quantity) || 0,
        minStockLimit: Number(item.stock_limit) || 0,
        unit: item.unit,
        cost: parseFloat(item.cost_per_unit) || 0,
        defectiveQuantity: Number(item.defective) || 0,
        totalQuantity: Number(item.total_quantity) || 0,
        created_at: item.created_at,
      }));

      setAllRawMaterials(materials);
      const lowStock = checkStockAlerts(materials);
      setLowStockCount(lowStock.length);
      setLowStockItems(lowStock);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setLowStockCount(0);
      setRawMaterialsCount(0);
    }
  }, []);

  // ---------------------------------------------
  // FETCH PRODUCTS
  // ---------------------------------------------
  const fetchProducts = useCallback(async () => {
    try {
      const response = await apiClient.post('/api/production/list/', {
        username: user.username
      });
      const productsData = response.data;

      const productsArray = Array.isArray(productsData)
        ? productsData
        : productsData.products || productsData.data?.products || [];

      const mapped = productsArray.map((product: ApiProduct) => {
        const materials = Object.entries(product.stock_needed || {}).map(
          ([materialName, quantity]) => ({
            materialName,
            quantity: Number(quantity) || 0,
          })
        );

        return {
          id: product.product_id,
          name: product.product_name,
          inventory: Number(product.inventory),
          maxProduce: Number(product.max_produce),
          originalMaxProduce: Number(product.original_max_produce),
          productionCostTotal: parseFloat(String(product.production_cost_total)),
          productionCostBreakdown: Object.entries(product.production_cost_breakdown || {}).reduce((acc, [k, v]) => ({ ...acc, [k]: Number(v) }), {}),
          stockNeeded: product.stock_needed || {},
          createdAt: product.created_at,
          wastage: parseFloat(String(product.wastage_percent)),
          wastageAmount: parseFloat(String(product.wastage_amount)),
          laborCost: parseFloat(String(product.labour_cost)),
          transportCost: parseFloat(String(product.transport_cost)),
          otherCost: parseFloat(String(product.other_cost)),
          totalCost: parseFloat(String(product.total_cost)),
          groupChain: {},
          materials,
        };
      });

      setProducts(mapped);
      setError(null);
    } catch (err: any) {
      setError("Failed to load products");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ---------------------------------------------
  // MONTHLY SUMMARY
  // ---------------------------------------------
  const fetchMonthlySummary = useCallback(async () => {
    try {
      setIsMonthlyLoading(true);
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
        2,
        "0"
      )}`;

      const response = await apiClient.post(
        "/api/reports/production/summary/monthly/",
        {
          month,
          username: user.username
        }
      );

      // Extract summary array and calculate total
      const summaryData = response.data.summary || [];
      const total = summaryData.reduce((sum: number, item: any) =>
        sum + (Number(item.total_quantity) || 0), 0
      );

      setMonthlySummary({
        ...response.data,
        items: summaryData, // Use summary array as items for display
        total: total
      });
    } catch {
      setMonthlySummary(null);
    } finally {
      setIsMonthlyLoading(false);
    }
  }, [user.username]);

  useEffect(() => {
    fetchProducts();
    fetchLowStockAndRawMaterials();
    fetchMonthlySummary();
  }, []);

  // ---------------------------------------------
  // REFRESH DASHBOARD
  // ---------------------------------------------
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchProducts();
    await fetchLowStockAndRawMaterials();
    setIsRefreshing(false);
  }, [fetchProducts, fetchLowStockAndRawMaterials]);

  // ---------------------------------------------
  // FILTER + SORT (heavy → memoized)
  // ---------------------------------------------
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const sortedProducts = useMemo(() => {
    const arr = [...filteredProducts];
    switch (sortOption) {
      case "name":
        return arr.sort((a, b) => a.name.localeCompare(b.name));
      case "maxProduce":
        return arr.sort((a, b) => b.maxProduce - a.maxProduce);
      case "cost":
        return arr.sort((a, b) => b.productionCostTotal - a.productionCostTotal);
      case "date":
        return arr.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      default:
        return arr;
    }
  }, [filteredProducts, sortOption]);

  // ---------------------------------------------
  // VIRTUALIZED PRODUCT LIST (LAG FIX ⭐)
  // ---------------------------------------------
  const Row = ({ index, style, data }: any) => {
    const { items, itemsPerRow, onViewDetails } = data;
    const startIndex = index * itemsPerRow;
    const rowItems = items.slice(startIndex, startIndex + itemsPerRow);

    return (
      <div style={style} className="px-4 py-2">
        <div className="flex gap-4 h-full">
          {rowItems.map((product: Product) => (
            <div key={product.id} className="flex-1 min-w-0 h-full">
              <DashboardProductCard
                product={product}
                onViewDetails={onViewDetails}
              />
            </div>
          ))}
          {/* Spacers for incomplete rows to maintain alignment */}
          {[...Array(itemsPerRow - rowItems.length)].map((_, i) => (
            <div key={`empty-${i}`} className="flex-1 min-w-0" />
          ))}
        </div>
      </div>
    );
  };

  // ---------------------------------------------
  // STATS SECTION
  // ---------------------------------------------
  const stats = useMemo(
    () => [
      {
        title: "Total Products",
        value: products.length,
        icon: Bed,
      },
      {
        title: "Low Stock Items",
        value: lowStockCount,
        icon: AlertTriangle,
      },
      {
        title: "Total Raw Materials",
        value: rawMaterialsCount,
        icon: Package2,
      },
    ],
    [products.length, lowStockCount, rawMaterialsCount]
  );

  // ---------------------------------------------
  // MONTHLY DOWNLOAD
  // ---------------------------------------------
  // ---------------------------------------------
  // EXCEL EXPORT (ALL DATA)
  // ---------------------------------------------
  const handleDownloadAllData = useCallback(() => {
    const wb = XLSX.utils.book_new();

    // 1. PRODUCTS SHEET
    const productData = products.map((p) => ({
      ID: p.id || "",
      Name: p.name || "Unknown",
      "Max Produce": Number(p.maxProduce) || 0,
      Inventory: Number(p.inventory) || 0,
      "Production Cost": Number(p.productionCostTotal) || 0,
      "Labour Cost": Number(p.laborCost) || 0,
      "Transport Cost": Number(p.transportCost) || 0,
      "Other Cost": Number(p.otherCost) || 0,
      "Total Cost": Number(p.totalCost) || 0,
      Wastage: Number(p.wastageAmount) || 0,
      "Created At": p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : "",
    }));
    const wsProducts = XLSX.utils.json_to_sheet(productData);
    XLSX.utils.book_append_sheet(wb, wsProducts, "Products");

    // 2. MONTHLY SUMMARY SHEET
    if (monthlySummary?.items) {
      const summaryData = monthlySummary.items.map((item: any) => ({
        Product: item.product_name,
        Quantity: item.quantity_produced || item.total_quantity,
      }));
      // Add total row
      summaryData.push({ Product: "TOTAL", Quantity: monthlySummary.total });

      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Monthly Summary");
    }

    // 3. RAW MATERIALS SHEET
    const materialData = allRawMaterials.map((m) => ({
      ID: m.id,
      Name: m.name,
      Available: m.available,
      "Min Stock Limit": m.minStockLimit,
      Unit: m.unit,
      "Cost Per Unit": m.cost,
      Defective: m.defectiveQuantity,
      "Total Quantity": m.totalQuantity,
    }));
    const wsMaterials = XLSX.utils.json_to_sheet(materialData);
    XLSX.utils.book_append_sheet(wb, wsMaterials, "Raw Materials");

    // 4. LOW STOCK ALERTS SHEET
    const lowStockData = lowStockItems.map((m) => ({
      ID: m.id,
      Name: m.name,
      Available: m.available,
      "Min Stock Limit": m.minStockLimit,
      Deficit: (m.minStockLimit || 0) - (m.available || 0),
    }));
    const wsLowStock = XLSX.utils.json_to_sheet(lowStockData);
    XLSX.utils.book_append_sheet(wb, wsLowStock, "Low Stock Alerts");

    // SAVE FILE
    XLSX.writeFile(wb, `Dashboard_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [products, monthlySummary, allRawMaterials, lowStockItems]);

  const downloadMonthlyExcel = useCallback(() => {
    if (!monthlySummary?.items) return;

    const sheetData = [
      ["Product", "Quantity"],
      ...monthlySummary.items.map((item: any) => [
        item.product_name,
        item.quantity_produced || item.total_quantity,
      ]),
      [],
      ["Total", monthlySummary.total],
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monthly Summary");
    XLSX.writeFile(wb, "monthly-production.xlsx");
  }, [monthlySummary]);

  // 📌 LOADING STATE
  if (isLoading || isRefreshing) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">

      {/* HEADER - Enhanced with gradient background */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-800 dark:via-purple-800 dark:to-pink-800 rounded-2xl shadow-xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-indigo-100 dark:text-indigo-200 text-sm md:text-base">Welcome back! Here's what's happening with your inventory.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 md:px-5 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-xl font-medium shadow-lg hover:bg-white/30 hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base whitespace-nowrap"
            >
              {isRefreshing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <RefreshCw className="h-5 w-5" />
              )}
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>

            <button
              onClick={handleDownloadAllData}
              className="flex items-center gap-2 px-4 md:px-5 py-2.5 bg-white text-indigo-600 dark:text-indigo-700 rounded-xl font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 text-sm md:text-base whitespace-nowrap"
              title="Download Full Dashboard Report"
            >
              <Download className="h-5 w-5" />
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((s, i) => (
          <StatsCard key={i} {...s} />
        ))}
      </div>

      {/* MONTHLY SUMMARY - Enhanced */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-6 md:p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-2xl">
        <div
          className="flex items-center justify-between cursor-pointer group"
          onClick={() => setMonthlyExpanded(!monthlyExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl transition-all duration-300 ${monthlyExpanded
              ? 'bg-indigo-100 dark:bg-indigo-900/50 rotate-0'
              : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30'
              }`}>
              {monthlyExpanded ? (
                <ChevronDown className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <ChevronRight className="h-6 w-6 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
              )}
            </div>
            <div>
              <h2 className="font-bold text-xl text-gray-900 dark:text-white">Monthly Production Summary</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            {isMonthlyLoading && (
              <Loader2 className="h-5 w-5 ml-2 animate-spin text-indigo-600 dark:text-indigo-400" />
            )}
          </div>

          <div className="flex gap-2">
            <button
              className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all duration-200 hover:scale-110"
              onClick={(e) => {
                e.stopPropagation();
                fetchMonthlySummary();
              }}
              title="Refresh monthly summary"
            >
              <RefreshCw className="h-5 w-5 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400" />
            </button>
            <button
              className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-green-100 dark:hover:bg-green-900/50 transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!monthlySummary}
              onClick={(e) => {
                e.stopPropagation();
                downloadMonthlyExcel();
              }}
              title="Download monthly report"
            >
              <Download className="h-5 w-5 text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400" />
            </button>
          </div>
        </div>

        {monthlyExpanded && monthlySummary && (
          <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30">
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      Quantity Produced
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {monthlySummary.items.map((item: any, index: number) => (
                    <tr
                      key={item.product_id}
                      className="hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                            {index + 1}
                          </span>
                          {item.product_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {(Number(item.total_quantity) || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 font-bold">
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white uppercase tracking-wide">
                      Total Production
                    </td>
                    <td className="px-6 py-4 text-right text-lg font-bold text-indigo-600 dark:text-indigo-400">
                      {(monthlySummary.total || 0).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {monthlyExpanded && !monthlySummary && !isMonthlyLoading && (
          <div className="mt-6 text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
            <Package2 className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No production data available for this month</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Start producing to see your monthly summary</p>
          </div>
        )}
      </div>

      {/* SEARCH + SORT - Enhanced */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Product Catalog</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {sortedProducts.length} {sortedProducts.length === 1 ? 'product' : 'products'} available
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* SEARCH */}
            <div className="relative flex-1 sm:flex-initial sm:min-w-[280px]">
              <Search className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Clear search"
                >
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* SORT */}
            <div className="relative">
              <select
                className="appearance-none w-full sm:w-auto pl-4 pr-10 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer font-medium"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="name">Sort by Name</option>
                <option value="maxProduce">Sort by Max Produce</option>
                <option value="cost">Sort by Cost</option>
                <option value="date">Sort by Date</option>
              </select>
              <ChevronDown className="h-5 w-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* VIRTUALIZED PRODUCT LIST - Enhanced */}
      <div className="h-[70vh] bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        {sortedProducts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 mb-6">
                <Package2 className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {searchQuery ? 'No products found' : 'No products available'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
                {searchQuery
                  ? `No products match "${searchQuery}". Try adjusting your search.`
                  : 'Start by adding products to your inventory to see them here.'
                }
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-6 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-medium shadow-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 hover:shadow-xl hover:scale-105 transition-all duration-200"
                >
                  Clear Search
                </button>
              )}
            </div>
          </div>
        ) : (
          <AutoSizer>
            {({ width, height }: { width: number; height: number }) => {
              const itemsPerRow = width < 768 ? 1 : width < 1280 ? 2 : 3;
              const rowCount = Math.ceil(sortedProducts.length / itemsPerRow);

              return (
                <FixedSizeList
                  height={height}
                  width={width}
                  itemCount={rowCount}
                  itemSize={500}
                  overscanCount={2}
                  itemData={{
                    items: sortedProducts,
                    itemsPerRow,
                    onViewDetails: setSelectedProduct
                  }}
                >
                  {Row}
                </FixedSizeList>
              );
            }}
          </AutoSizer>
        )}
      </div>

      {/* MODAL (Lazy-loaded + smooth AF) */}
      <Suspense fallback={null}>
        {selectedProduct && (
          <ProductDetailsModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
          />
        )}
      </Suspense>
    </div >
  );
};

export default Dashboard;
