import React, { useEffect, useState } from 'react';
import { axiosInstance } from '../utils/axiosInstance';
import { fetchAllStocks } from '../utils/inventoryApi';
import { NewGroupForm } from './NewGroupForm';
import { NewMaterialForm } from './NewMaterialForm';
import { Edit2, Trash2, Check, X, ArrowUpDown, Download, MessageCircle, Search, ChevronsDown, ChevronsUp } from 'lucide-react';
import { HighlightText } from '../utils/searchUtils';
import { StockAlerts } from './StockAlerts';
import { checkStockAlerts } from '../utils/stockMonitoring';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import { useAuth } from '../contexts/AuthContext';
import StockAdjustModal from './StockAdjustModal';
import { InventorySkeleton } from './skeletons/InventorySkeleton';
import { useInventorySearch, InventoryGroup, InventoryItem } from '../hooks/useInventorySearch';

// Alias types to match existing usage if needed, or just use them
type MaterialItem = InventoryItem;
type GroupNode = InventoryGroup;

const GROUP_TABLE_HEADER = [
  { key: 'name', label: 'Material' },
  { key: 'quantity', label: 'Available' },
  { key: 'defective', label: 'Defective' },
  { key: 'total_quantity', label: 'Total Qty' },
  { key: 'unit', label: 'UNIT' },
  { key: 'cost_per_unit', label: 'Cost Per Unit' },
  { key: 'gst', label: 'GST %' },
  { key: 'gst_amount', label: 'GST Amount' },
  { key: 'total_cost', label: 'Total Cost' },
  { key: 'stock_limit', label: 'Stock Limit' },
  { key: 'actions', label: 'ACTIONS' },
];

const GroupTree: React.FC = () => {
  const { user } = useAuth();
  const [tree, setTree] = useState<GroupNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showSubgroupForm, setShowSubgroupForm] = useState<{ parentId: string } | null>(null);
  const [showMaterialForm, setShowMaterialForm] = useState<{ groupId: string } | null>(null);
  const [refreshFlag, setRefreshFlag] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<{ [id: string]: boolean }>({});
  const [editingMaterial, setEditingMaterial] = useState<any | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [mainGroupSortAsc, setMainGroupSortAsc] = useState(true);

  const [deleteGroupLoading, setDeleteGroupLoading] = useState<string | null>(null);
  const [deleteGroupMessage, setDeleteGroupMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<{ id: string, name: string } | null>(null);
  const [loadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalMode, setStockModalMode] = useState<'add' | 'subtract'>('add');
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialItem | null>(null);
  const [isStockProcessing, setIsStockProcessing] = useState(false);
  const [showDefectiveModal, setShowDefectiveModal] = useState(false);
  const [defectiveModalMode, setDefectiveModalMode] = useState<'add' | 'subtract'>('add');
  const [selectedDefectiveMaterial, setSelectedDefectiveMaterial] = useState<MaterialItem | null>(null);
  const [isDefectiveProcessing, setIsDefectiveProcessing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<any | null>(null);
  const [isDeletingMaterial, setIsDeletingMaterial] = useState(false);
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [remarksMaterial, setRemarksMaterial] = useState<MaterialItem | null>(null);
  const [remarksInput, setRemarksInput] = useState('');
  const [remarksLoading, setRemarksLoading] = useState(false);
  const [remarksError, setRemarksError] = useState<string | null>(null);
  const [viewedRemark, setViewedRemark] = useState<{ description: string; username: string; created_at: string } | null>(null);

  const { query, setQuery, filteredData: filteredTree } = useInventorySearch(tree);

  useEffect(() => {
    fetchTree();
    // eslint-disable-next-line
  }, [refreshFlag]);

  async function fetchTree() {
    setLoading(true);
    try {
      const data = await fetchAllStocks(user.username);

      // Parse the data to convert string values to numbers and map gst_percentage to gst
      // Type assertion needed as legacy API response might differ slightly from strict InventoryGroup
      const parsedData = data.map((group: any) => ({
        ...group,
        items: group.items?.map((item: any) => ({
          ...item,
          quantity: Number(item.quantity),
          defective: Number(item.defective),
          cost_per_unit: Number(item.cost_per_unit),
          stock_limit: Number(item.stock_limit),
          total_quantity: Number(item.total_quantity),
          gst: Number(item.gst_percentage || item.gst || 0),
          gst_amount: Number(item.gst_amount || 0),
          total_cost: Number(item.total_cost || 0),
          matches: undefined
        })) || [],
        subgroups: group.subgroups?.map((subgroup: any) => ({
          ...subgroup,
          items: subgroup.items?.map((item: any) => ({
            ...item,
            quantity: Number(item.quantity),
            defective: Number(item.defective),
            cost_per_unit: Number(item.cost_per_unit),
            stock_limit: Number(item.stock_limit),
            total_quantity: Number(item.total_quantity),
            gst: Number(item.gst_percentage || item.gst || 0),
            gst_amount: Number(item.gst_amount || 0),
            total_cost: Number(item.total_cost || 0),
            matches: undefined
          })) || [],
          matches: undefined
        })) || [],
        matches: undefined
      }));

      setTree(parsedData);
    } catch (e) {
      setTree([]);
    }
    setLoading(false);
  }

  // Auto-expand groups when searching
  useEffect(() => {
    if (query.trim()) {
      const newExpanded: { [key: string]: boolean } = {};
      const expandRecursive = (nodes: InventoryGroup[]) => {
        nodes.forEach(node => {
          newExpanded[node.group_id || node.group_name] = true;
          if (node.subgroups) expandRecursive(node.subgroups);
        });
      };
      expandRecursive(filteredTree);
      setExpandedGroups(prev => ({ ...prev, ...newExpanded }));
    }
  }, [query, filteredTree]);
  // Add Material
  const handleAddMaterial = async (material: any, groupId: string) => {
    try {
      const payload = {
        name: material.name,
        quantity: material.quantity,
        defective: material.defective,
        cost_per_unit: material.cost_per_unit,
        gst: material.gst,
        stock_limit: material.stock_limit,
        username: user.username,
        unit: material.unit,
        group_id: groupId
      };

      const response = await axiosInstance.post('/api/stock/create/', payload);

      if (response.data && response.data.message === "Stock created successfully.") {
        setMessage(`Stock '${material.name}' created successfully.`);
        setShowMaterialForm(null);
        setRefreshFlag(f => f + 1);
      } else {
        // Optionally handle unexpected success messages or silent failures if needed
        // For now, if message doesn't match, we don't refresh/close (as per strict instruction)
        console.warn("Stock creation response message mismatch:", response.data);
      }
    } catch (error: any) {
      console.error("Error creating stock:", error);
      setError(error?.response?.data?.message || error?.message || 'Failed to create stock');
    }
  };

  const handleEdit = (item: any) => {
    setEditingMaterial(item.item_id);
    setEditValues({ ...item });
  };

  const handleEditChange = (field: string, value: any) => {
    setEditValues((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleEditCancel = () => {
    setEditingMaterial(null);
    setEditValues({});
  };

  const handleEditSave = async (groupId: string, item: any) => {
    const { updateStockDetails } = await import('../utils/inventoryApi');

    await updateStockDetails({
      name: editValues.name,
      username: user.username,
      gst: Number(editValues.gst || 0),
      cost_per_unit: Number(editValues.cost_per_unit),
      unit: editValues.unit,
      stock_limit: Number(editValues.stock_limit)
    });

    setEditingMaterial(null);
    setEditValues({});
    setRefreshFlag(f => f + 1);
  };

  const handleDelete = async (item: any) => {
    try {
      const payload = {
        name: item.name,
        username: user.username
      };
      const response = await axiosInstance.post('/api/stock/delete/', payload);

      if (response.data && response.data.message) {
        setMessage(response.data.message);
      } else {
        setMessage('Stock deleted successfully.');
      }
      setRefreshFlag(f => f + 1);
    } catch (e: any) {
      setError(e.message || 'Failed to delete stock.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!materialToDelete) return;
    setIsDeletingMaterial(true);
    try {
      await handleDelete(materialToDelete);
      setShowDeleteDialog(false);
      setMaterialToDelete(null);
    } finally {
      setIsDeletingMaterial(false);
    }
  };

  const getAllGroupIds = (nodes: GroupNode[]): string[] => {
    let ids: string[] = [];
    nodes.forEach(node => {
      const key = node.group_id || node.group_name;
      if (key) ids.push(key);
      if (node.subgroups) {
        ids = ids.concat(getAllGroupIds(node.subgroups));
      }
    });
    return ids;
  };

  const handleToggleExpandAll = () => {
    const allIds = getAllGroupIds(tree);
    // If any are not expanded, we expand all. Only if ALL are expanded do we collapse all.
    // Or we can check if > 0 expanded? 
    // Usually a toggle state is better tracked, but derived state logic is:
    // If all are open -> Close All
    // Otherwise -> Open All
    const allExpanded = allIds.length > 0 && allIds.every(id => expandedGroups[id]);

    if (allExpanded) {
      setExpandedGroups({});
    } else {
      const newExpanded = allIds.reduce((acc: any, id) => {
        acc[id] = true;
        return acc;
      }, {});
      setExpandedGroups(newExpanded);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDownloadGroupMaterials = (groupName: string, group: GroupNode) => {
    try {
      // Define the columns for the Excel sheet (excluding 'actions')
      const excelColumns = [
        { key: 'subgroup', label: 'Subgroup' },
        ...GROUP_TABLE_HEADER.filter(col => col.key !== 'actions')
      ];

      // Recursively collect all materials from this group and its subgroups
      const collectAllMaterials = (currentGroup: GroupNode, parentName: string = ''): any[] => {
        let materials: any[] = [];

        // Add materials from current group
        if (currentGroup.items && currentGroup.items.length > 0) {
          materials = materials.concat(
            currentGroup.items.map(item => ({
              ...item,
              subgroup: parentName || 'Main Group'
            }))
          );
        }

        // Recursively add materials from subgroups
        if (currentGroup.subgroups && currentGroup.subgroups.length > 0) {
          currentGroup.subgroups.forEach(subgroup => {
            materials = materials.concat(
              collectAllMaterials(subgroup, subgroup.group_name)
            );
          });
        }

        return materials;
      };

      // Get all materials including those from subgroups
      const allMaterials = collectAllMaterials(group);

      // Group materials by subgroup
      const groupedMaterials = allMaterials.reduce((acc: { [key: string]: any[] }, material) => {
        const subgroup = material.subgroup;
        if (!acc[subgroup]) {
          acc[subgroup] = [];
        }
        acc[subgroup].push(material);
        return acc;
      }, {});

      // Sort subgroups alphabetically
      const sortedSubgroups = Object.keys(groupedMaterials).sort((a, b) => {
        if (a === 'Main Group') return -1;
        if (b === 'Main Group') return 1;
        return a.localeCompare(b);
      });

      // Prepare data for Excel with hierarchy
      const data: any[] = [];

      // Add header row
      data.push(excelColumns.map(col => col.label));

      // Process each subgroup
      sortedSubgroups.forEach(subgroup => {
        const materials = groupedMaterials[subgroup];

        // Add subgroup header
        data.push([subgroup, ...Array(excelColumns.length - 1).fill('')]);

        // Add materials for this subgroup
        const sortedMaterials = materials
          .filter(item => {
            const term = query.trim().toLowerCase();
            if (!term) return true;
            return item.name.toLowerCase().includes(term) || (item.item_id && item.item_id.toLowerCase().includes(term));
          })
          .sort((a, b) => {
            let aVal: any, bVal: any;
            if (sortField === 'name') {
              aVal = a.name.toLowerCase();
              bVal = b.name.toLowerCase();
            } else if (sortField === 'quantity') {
              aVal = a.quantity;
              bVal = b.quantity;
            } else if (sortField === 'defective') {
              aVal = a.defective;
              bVal = b.defective;
            } else if (sortField === 'unit') {
              aVal = a.unit.toLowerCase();
              bVal = b.unit.toLowerCase();
            } else if (sortField === 'cost_per_unit') {
              aVal = a.cost_per_unit;
              bVal = b.cost_per_unit;
            } else if (sortField === 'total_cost') {
              aVal = a.quantity * a.cost_per_unit;
              bVal = b.quantity * b.cost_per_unit;
            } else if (sortField === 'stock_limit') {
              aVal = a.stock_limit;
              bVal = b.stock_limit;
            } else {
              return 0;
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
          });

        // Add materials to data
        sortedMaterials.forEach(item => {
          const row: any = {};
          excelColumns.forEach(col => {
            if (col.key === 'total_cost') {
              row[col.label] = (Number(item.quantity) * Number(item.cost_per_unit)).toFixed(2);
            } else {
              row[col.label] = item[col.key];
            }
          });
          data.push(Object.values(row));
        });

        // Add subtotal row for this subgroup
        const subtotal = {
          quantity: materials.reduce((sum, item) => sum + item.quantity, 0),
          defective: materials.reduce((sum, item) => sum + item.defective, 0),
          total_cost: materials.reduce((sum, item) => sum + (item.quantity * item.cost_per_unit), 0)
        };

        data.push([
          `Subtotal for ${subgroup}`,
          '', // Material (empty)
          subtotal.quantity, // Available
          subtotal.defective, // Defective
          '', // Total Qty (empty)
          '', // Unit (empty)
          '', // Cost per unit (empty)
          subtotal.total_cost.toFixed(2), // Total Cost
          '' // Stock limit (empty)
        ]);

        // Add empty row for visual separation
        data.push(Array(excelColumns.length).fill(''));
      });

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(data);

      // Set column widths (basic estimation)
      const colWidths = excelColumns.map(col => ({ wch: Math.max(col.label.length + 5, 15) }));
      ws['!cols'] = colWidths;

      // Add styling for subgroup headers and subtotals
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let R = range.s.r; R <= range.e.r; R++) {
        const cell = ws[XLSX.utils.encode_cell({ r: R, c: 0 })];
        if (cell && cell.v && typeof cell.v === 'string' && cell.v.includes('Subtotal')) {
          // Style subtotal rows
          cell.s = {
            font: { bold: true },
            fill: { fgColor: { rgb: "E2E8F0" } }
          };
        } else if (cell && cell.v && typeof cell.v === 'string' &&
          (cell.v === 'Main Group' || !cell.v.includes('Subtotal'))) {
          // Style subgroup headers
          cell.s = {
            font: { bold: true },
            fill: { fgColor: { rgb: "F0FDF4" } }
          };
        }
      }

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, groupName.substring(0, 31)); // Sheet name max 31 chars

      // Generate filename with group name and current date
      const fileName = `${groupName.replace(/[^a-zA-Z0-9]/g, '_ ')}-inventory-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

      // Download file
      XLSX.writeFile(wb, fileName);

    } catch (error) {
      console.error('Error downloading group inventory:', error);
      // Optionally show a user-friendly error message
    }
  };



  // Recursive render for groups/subgroups/items
  function renderGroup(group: GroupNode, level = 0) {
    const groupKey = group.group_id || group.group_name;
    const expanded = expandedGroups[groupKey] ?? false;
    const isMainGroup = level === 0;

    // Card Layout for both main groups and subgroups
    const cardBase =
      'rounded-xl shadow-lg border border-lime-100 dark:border-gray-700 bg-gradient-to-br from-lime-50 to-white dark:from-gray-800 dark:to-gray-900 hover:shadow-xl transition-all duration-200';
    const headerBase =
      'flex flex-col sm:flex-row sm:items-center justify-between rounded-t-xl border-b border-lime-200 dark:border-gray-600 bg-gradient-to-r from-lime-200 via-lime-100 to-white dark:from-gray-700 dark:via-gray-800 dark:to-gray-900';
    const groupScale = isMainGroup ? 'px-4 sm:px-6 py-4' : 'px-3 sm:px-4 py-2';
    const groupFont = isMainGroup ? 'text-lg sm:text-xl' : 'text-sm sm:text-base';
    const groupNameFont = isMainGroup ? 'font-extrabold' : 'font-bold';
    const groupIdFont = isMainGroup ? 'text-xs' : 'text-[10px]';
    const cardMargin = isMainGroup ? 'mb-6' : 'mb-3 ml-2 sm:ml-6';
    const actionBtn =
      'flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-lg border shadow-sm transition';
    const addSubgroupBtn = 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border-green-200 dark:border-green-800';
    const addMaterialBtn = 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800';
    const expandBtn = 'flex items-center justify-center w-8 h-8 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow';

    // Filter and sort items within this group
    const filteredItems = group.items; // Filtering is handled globally now


    // Sort items
    const sortedItems = [...filteredItems].sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortField === 'name') {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortField === 'quantity') {
        aVal = a.quantity;
        bVal = b.quantity;
      } else if (sortField === 'defective') {
        aVal = a.defective;
        bVal = b.defective;
      } else if (sortField === 'unit') {
        aVal = a.unit.toLowerCase();
        bVal = b.unit.toLowerCase();
      } else if (sortField === 'cost_per_unit') {
        aVal = a.cost_per_unit;
        bVal = b.cost_per_unit;
      } else if (sortField === 'total_cost') {
        aVal = a.quantity * a.cost_per_unit;
        bVal = b.quantity * b.cost_per_unit;
      } else if (sortField === 'stock_limit') {
        aVal = a.stock_limit;
        bVal = b.stock_limit;
      } else {
        return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return (
      <div key={groupKey} className={`${cardBase} ${cardMargin}`}>
        <div className={`${headerBase} ${groupScale}`}>
          <div className="flex items-center gap-3">
            <div>
              <div className={`${groupNameFont} text-gray-900 dark:text-white`}>{group.group_name}</div>
              <div className={`${groupIdFont} text-gray-500 dark:text-gray-400`}>ID: {group.group_id || 'N/A'}</div>
            </div>
            {group.group_id && (
              <button
                className="ml-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-full p-1.5 transition shadow-sm"
                onClick={() => setGroupToDelete({ id: group.group_id!, name: group.group_name })}
                title="Delete Group"
                disabled={deleteGroupLoading === group.group_id}
              >
                {deleteGroupLoading === group.group_id ? (
                  <span className="animate-spin"><Trash2 size={18} /></span>
                ) : (
                  <Trash2 size={18} />
                )}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            {group.group_id && (
              <>
                <button
                  className={`${actionBtn} ${addSubgroupBtn}`}
                  style={{ fontSize: isMainGroup ? '0.85rem' : '0.75rem' }}
                  onClick={() => setShowSubgroupForm({ parentId: group.group_id! })}
                  title="Add Subgroup"
                >
                  <span className="hidden sm:inline">Add Subgroup</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </button>
                <button
                  className={`${actionBtn} ${addMaterialBtn}`}
                  style={{ fontSize: isMainGroup ? '0.85rem' : '0.75rem' }}
                  onClick={() => setShowMaterialForm({ groupId: group.group_id! })}
                  title="Add Material"
                >
                  <span className="hidden sm:inline">Add Material</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </button>
                <button
                  className={`${actionBtn} text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-gray-200 dark:border-gray-600`}
                  onClick={() => handleDownloadGroupMaterials(group.group_name, group)}
                  title={`Download '${group.group_name}' Inventory`}
                >
                  <span className="hidden sm:inline">Download</span>
                  <Download size={18} />
                </button>
              </>
            )}
            <button
              onClick={() => setExpandedGroups(prev => ({ ...prev, [groupKey]: !expanded }))}
              className={`${expandBtn} ${groupFont}`}
              title={expanded ? 'Collapse' : 'Expand'}
            >
              <svg
                className={`w-4 h-4 text-gray-600 dark:text-gray-300 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
        {expanded && (
          <div className="p-4">

            {/* Items as Table */}
            {sortedItems.length > 0 && (
              <div className="overflow-x-auto mt-2 animate-fade-in">
                <table className="min-w-full rounded-xl border border-gray-200 shadow-sm">
                  <thead>
                    <tr className="bg-lime-600 dark:bg-lime-800">
                      {GROUP_TABLE_HEADER.map(col => (
                        <th
                          key={col.key}
                          className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider select-none cursor-pointer whitespace-nowrap"
                          onClick={() => col.key !== 'actions' && handleSort(col.key)}
                          style={{ position: 'sticky', top: 0, background: '#7ac943' }}
                        >
                          <span className="flex items-center gap-1">
                            {col.label}
                            {col.key !== 'actions' && <ArrowUpDown size={14} />}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                    {sortedItems.map((item, idx) => (
                      <tr
                        key={item.item_id}
                        className={
                          (idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-800') +
                          ' transition-all duration-150 hover:bg-lime-50 dark:hover:bg-gray-600'
                        }
                        style={{ transition: 'background 0.2s' }}
                      >
                        {/* Material Name */}
                        <td className="px-3 sm:px-6 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                          <HighlightText text={item.name} highlight={query} matches={item.matches} />
                        </td>
                        {/* Available */}
                        <td className="px-3 sm:px-6 py-3 whitespace-nowrap text-gray-900 dark:text-white">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleSubtractStock(item)}
                              className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
                              disabled={loadingId === item.item_id}
                              title="Subtract quantity"
                              aria-label="Subtract quantity"
                            >
                              −
                            </button>
                            <span>{item.quantity} {item.unit}</span>
                            <button
                              onClick={() => handleAddStock(item)}
                              className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50"
                              disabled={loadingId === item.item_id}
                              title="Add quantity"
                              aria-label="Add quantity"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        {/* Defective */}
                        <td className="px-3 sm:px-6 py-3 whitespace-nowrap text-gray-900 dark:text-white">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleSubtractDefective(item)}
                              className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
                              disabled={loadingId === item.item_id}
                              title="Subtract defective quantity"
                              aria-label="Subtract defective quantity"
                            >
                              −
                            </button>
                            <span>{item.defective} {item.unit}</span>
                            <button
                              onClick={() => handleAddDefective(item)}
                              className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50"
                              disabled={loadingId === item.item_id}
                              title="Add defective quantity"
                              aria-label="Add defective quantity"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        {/* Total Qty */}
                        <td className="px-3 sm:px-6 py-3 whitespace-nowrap text-center text-gray-900 dark:text-white">
                          {item.total_quantity !== undefined ? item.total_quantity : '-'}
                        </td>
                        {/* Unit */}
                        <td className="px-3 sm:px-6 py-3 whitespace-nowrap text-gray-900 dark:text-white">
                          {editingMaterial === item.item_id ? (
                            <input
                              type="text"
                              className="w-16 px-3 py-1 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              value={editValues.unit}
                              onChange={e => handleEditChange('unit', e.target.value)}
                              title="Unit"
                              placeholder="Unit"
                            />
                          ) : (
                            item.unit
                          )}
                        </td>
                        {/* Cost Per Unit */}
                        <td className="px-3 sm:px-6 py-3 whitespace-nowrap text-gray-900 dark:text-white">
                          {editingMaterial === item.item_id ? (
                            <input
                              type="number"
                              className="w-28 px-3 py-1 border border-indigo-200 dark:border-indigo-800 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              value={editValues.cost_per_unit}
                              onChange={e => handleEditChange('cost_per_unit', e.target.value)}
                              title="Cost per unit"
                              placeholder="Cost per unit"
                            />
                          ) : (
                            `₹${item.cost_per_unit}`
                          )}
                        </td>
                        {/* GST % */}
                        <td className="px-3 sm:px-6 py-3 whitespace-nowrap text-gray-900 dark:text-white">
                          {editingMaterial === item.item_id ? (
                            <input
                              type="number"
                              className="w-16 px-3 py-1 border border-indigo-200 dark:border-indigo-800 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              value={editValues.gst}
                              onChange={e => handleEditChange('gst', e.target.value)}
                              title="GST %"
                              placeholder="GST"
                            />
                          ) : (
                            `${item.gst || 0}%`
                          )}
                        </td>
                        {/* GST Amount */}
                        <td className="px-3 sm:px-6 py-3 whitespace-nowrap text-gray-900 dark:text-white">
                          ₹{item.gst_amount || 0}
                        </td>
                        {/* Total Cost */}
                        <td className="px-3 sm:px-6 py-3 whitespace-nowrap text-gray-900 dark:text-white">₹{item.total_cost || 0}</td>
                        {/* Stock Limit */}
                        <td className="px-3 sm:px-6 py-3 whitespace-nowrap text-gray-900 dark:text-white">
                          {editingMaterial === item.item_id ? (
                            <input
                              type="number"
                              className="w-24 px-3 py-1 border border-yellow-200 dark:border-yellow-800 rounded-lg focus:ring-2 focus:ring-yellow-300 focus:border-yellow-400 outline-none transition bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              value={editValues.stock_limit}
                              onChange={e => handleEditChange('stock_limit', e.target.value)}
                              title="Stock limit"
                              placeholder="Stock limit"
                            />
                          ) : (
                            item.stock_limit
                          )}
                        </td>
                        {/* Actions */}
                        <td className="px-3 sm:px-6 py-3 whitespace-nowrap">
                          {editingMaterial === item.item_id ? (
                            <div className="flex gap-2">
                              <button
                                className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full p-1.5 transition shadow-sm"
                                onClick={() => handleEditSave(String(group.group_id), item)}
                                title="Save"
                              >
                                <Check size={18} />
                              </button>
                              <button
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full p-1.5 transition shadow-sm"
                                onClick={handleEditCancel}
                                title="Cancel"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-full p-1.5 transition shadow-sm"
                                onClick={() => handleEdit(item)}
                                title="Edit"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-full p-1.5 transition shadow-sm"
                                onClick={() => handleDeleteClick(item)}
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                              <button
                                className="p-1 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 focus:outline-none transition"
                                title="Remarks"
                                aria-label="Remarks"
                                onClick={() => openRemarksModal(item)}
                              >
                                <MessageCircle size={18} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
            }
            {/* Empty state for items */}
            {
              sortedItems.length === 0 && query !== '' && (
                <div className="text-gray-400 text-sm italic mt-2">No materials match your search in this group.</div>
              )
            }
            {
              sortedItems.length === 0 && !query && (
                <div className="text-gray-400 text-xs italic mt-2">No materials in this group.</div>
              )
            }

            {/* Subgroups */}
            {
              group.subgroups && group.subgroups.length > 0 && (
                <div className="mt-2">
                  {group.subgroups
                    .slice()
                    .sort((a, b) => {
                      if (!a.group_name || !b.group_name) return 0;
                      if (mainGroupSortAsc) {
                        return a.group_name.localeCompare(b.group_name);
                      } else {
                        return b.group_name.localeCompare(a.group_name);
                      }
                    })
                    .map(sub => (
                      <React.Fragment key={sub.group_id || sub.group_name}>
                        {renderGroup(sub, level + 1)}
                      </React.Fragment>
                    ))}
                </div>
              )
            }
          </div >
        )
        }
      </div >
    );
  }

  // Recursively filter groups and subgroups by name


  // Helper to flatten all items in the group tree, with subgroup and main group context
  function flattenItemsWithContext(groups: GroupNode[], mainGroupName: string | null = null, parentGroupName: string | null = null): any[] {
    return groups.flatMap(g => {
      const currentMain = mainGroupName || g.group_name;
      const currentSub = parentGroupName ? g.group_name : null;
      const itemsWithContext = (g.items || []).map(item => ({
        ...item,
        subgroup: currentSub || 'Main Group',
        mainGroup: currentMain,
      }));
      return [
        ...itemsWithContext,
        ...(g.subgroups ? flattenItemsWithContext(g.subgroups, currentMain, g.group_name) : [])
      ];
    });
  }



  const handleDeleteGroup = async (groupId: string) => {
    setDeleteGroupLoading(groupId);
    setDeleteGroupMessage(null);
    try {
      const payload = {
        group_id: groupId
      };
      const response = await axiosInstance.post('/api/stock/groups/delete/', payload);

      if (response.data && response.data.message === 'Group deleted successfully') {
        setDeleteGroupMessage({ type: 'success', text: 'Group deleted successfully' });
        setRefreshFlag(f => f + 1);
      } else {
        setDeleteGroupMessage({ type: 'error', text: 'Group not deleted, please try again.' });
      }
    } catch (e) {
      setDeleteGroupMessage({ type: 'error', text: 'Group not deleted, please try again.' });
    } finally {
      setDeleteGroupLoading(null);
      setGroupToDelete(null);
    }
  };

  // Add/subtract handlers
  const handleAddStock = (item: MaterialItem) => {
    setSelectedMaterial(item);
    setStockModalMode('add');
    setShowStockModal(true);
  };

  const handleSubtractStock = (item: MaterialItem) => {
    setSelectedMaterial(item);
    setStockModalMode('subtract');
    setShowStockModal(true);
  };

  const handleStockModalConfirm = async (quantity: number, supplierName?: string) => {
    if (!selectedMaterial) return;
    setIsStockProcessing(true);
    setError(null);
    try {
      if (stockModalMode === 'add') {
        const payload = {
          name: selectedMaterial.name,
          quantity_to_add: quantity,
          username: user.username,
          supplier_name: supplierName
        };
        const response = await axiosInstance.post('/api/stock/add-quantity/', payload);

        if (response.data && response.data.message) {
          setMessage(response.data.message);
        } else {
          setMessage(`Added ${quantity} units to stock '${selectedMaterial.name}'.`);
        }
      } else {
        const payload = {
          name: selectedMaterial.name,
          quantity_to_subtract: quantity,
          username: user.username
        };
        const response = await axiosInstance.post('/api/stock/subtract-quantity/', payload);

        if (response.data && response.data.message) {
          setMessage(response.data.message);
        } else {
          setMessage(`Subtracted ${quantity} units from stock '${selectedMaterial.name}'.`);
        }
      }
      setShowStockModal(false);
      setSelectedMaterial(null);
      fetchTree();
    } catch (e: any) {
      setError(e.message || `Failed to ${stockModalMode} stock.`);
    } finally {
      setIsStockProcessing(false);
    }
  };

  const handleStockModalCancel = () => {
    setShowStockModal(false);
    setSelectedMaterial(null);
  };

  const handleAddDefective = (item: MaterialItem) => {
    setSelectedDefectiveMaterial(item);
    setDefectiveModalMode('add');
    setShowDefectiveModal(true);
  };

  const handleSubtractDefective = (item: MaterialItem) => {
    setSelectedDefectiveMaterial(item);
    setDefectiveModalMode('subtract');
    setShowDefectiveModal(true);
  };

  const handleDefectiveModalConfirm = async (quantity: number) => {
    if (!selectedDefectiveMaterial) return;
    setIsDefectiveProcessing(true);
    setError(null);
    try {
      if (defectiveModalMode === 'add') {
        const payload = {
          name: selectedDefectiveMaterial.name,
          defective_to_add: quantity,
          username: user.username
        };
        const response = await axiosInstance.post('/api/stock/add-defective/', payload);

        if (response.data && response.data.message) {
          setMessage(response.data.message);
        } else {
          setMessage(`Added ${quantity} defective units to '${selectedDefectiveMaterial.name}'.`);
        }
      } else {
        const payload = {
          name: selectedDefectiveMaterial.name,
          defective_to_subtract: quantity,
          username: user.username
        };
        const response = await axiosInstance.post('/api/stock/subtract-defective/', payload);

        if (response.data && response.data.message) {
          setMessage(response.data.message);
        } else {
          setMessage(`Subtracted ${quantity} defective units from '${selectedDefectiveMaterial.name}'.`);
        }
      }
      setShowDefectiveModal(false);
      setSelectedDefectiveMaterial(null);
      fetchTree();
    } catch (e: any) {
      setError(e.message || `Failed to ${defectiveModalMode} defective quantity.`);
    } finally {
      setIsDefectiveProcessing(false);
    }
  };

  const handleDefectiveModalCancel = () => {
    setShowDefectiveModal(false);
    setSelectedDefectiveMaterial(null);
  };

  const handleDeleteClick = (item: any) => {
    setMaterialToDelete(item);
    setShowDeleteDialog(true);
  };

  const openRemarksModal = (material: MaterialItem) => {
    setRemarksMaterial(material);
    setShowRemarksModal(true);
    setRemarksInput('');
    setViewedRemark(null);
    setRemarksError(null);
  };

  const closeRemarksModal = () => {
    setShowRemarksModal(false);
    setRemarksMaterial(null);
    setRemarksInput('');
    setViewedRemark(null);
    setRemarksError(null);
  };

  const handleViewRemark = async () => {
    console.log('View triggered');
    if (!remarksMaterial) return;
    setRemarksLoading(true);
    setRemarksError(null);
    try {
      const payload = {
        stock: remarksMaterial.name
      };
      const response = await axiosInstance.post('/api/stock/descriptions/get/', payload);
      const res = response.data;
      if (res && res.description) {
        setViewedRemark(res);
      } else {
        setViewedRemark(null);
        setRemarksError('No remark found.');
      }
    } catch (e: any) {
      setRemarksError(e.message || 'Failed to fetch description.');
    } finally {
      setRemarksLoading(false);
    }
  };

  const handleSaveRemark = async () => {
    console.log('Save triggered');
    if (!remarksMaterial) return;
    setRemarksLoading(true);
    setRemarksError(null);
    try {
      const payload = {
        stock: remarksMaterial.name,
        description: remarksInput,
        username: user.username,
      };
      const response = await axiosInstance.post('/api/stock/descriptions/create/', payload);

      const res = response.data;
      setMessage(res.message || 'Description saved successfully.');
      // After saving, refresh the displayed remarks
      await handleViewRemark();
      setRemarksInput('');
    } catch (e: any) {
      setRemarksError(e.message || 'Failed to save description.');
    } finally {
      setRemarksLoading(false);
    }
  };

  // Show skeleton while loading
  if (loading) {
    return <InventorySkeleton />;
  }

  // Top-level render
  return (
    <div className="p-4">

      <div>
        {/* Low Stock Alerts */}
        <StockAlerts
          alerts={checkStockAlerts(
            flattenItemsWithContext(tree).map((item: any) => ({
              id: item.item_id,
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              cost: item.cost_per_unit,
              available: item.quantity,
              minStockLimit: item.stock_limit,
              defectiveQuantity: item.defective,
              created_at: item.created_at || undefined
            }))
          )}
        />
        {deleteGroupMessage && (
          <div className={`mb-4 p-3 rounded-md border flex items-center gap-2 ${deleteGroupMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {deleteGroupMessage.type === 'success' ? (
              <Check className="h-5 w-5 text-green-400" />
            ) : (
              <X className="h-5 w-5 text-red-400" />
            )}
            <span>{deleteGroupMessage.text}</span>
            <button className="ml-auto text-gray-400 hover:text-gray-600" onClick={() => setDeleteGroupMessage(null)} title="Close">✕</button>
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Management</h2>
          <div className="flex flex-1 gap-2 items-center justify-end">
            <button
              className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-all duration-200 flex items-center gap-2"
              onClick={handleToggleExpandAll}
              title="Expand/Collapse All Groups"
            >
              {getAllGroupIds(tree).length > 0 && getAllGroupIds(tree).every(id => expandedGroups[id]) ? (
                <>
                  <ChevronsUp size={18} />
                  <span className="hidden xl:inline text-sm font-medium">Collapse All</span>
                </>
              ) : (
                <>
                  <ChevronsDown size={18} />
                  <span className="hidden xl:inline text-sm font-medium">Expand All</span>
                </>
              )}
            </button>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Smart Search (e.g. 'screw 10mm')..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm focus:ring-2 focus:ring-lime-400 focus:border-lime-400 outline-none transition text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300"
              />
            </div>
            <button
              className="bg-lime-600 text-white px-4 py-2 rounded hover:bg-lime-700 shadow-sm flex items-center gap-2"
              onClick={() => setMainGroupSortAsc((asc) => !asc)}
              title={`Sort Main Groups ${mainGroupSortAsc ? 'Z-A' : 'A-Z'}`}
            >
              <ArrowUpDown size={18} />
              {mainGroupSortAsc ? 'A-Z' : 'Z-A'}
            </button>
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 shadow-sm"
              onClick={() => setShowGroupForm(true)}
            >
              + Add Main Group
            </button>
            <button
              className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 border dark:border-gray-600"
              onClick={() => setRefreshFlag(f => f + 1)}
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded shadow p-4">
          {loading ? (
            <div>Loading...</div>
          ) : (
            <div>
              {tree.length === 0 && <div className="text-gray-400">No groups found.</div>}
              {filteredTree.length === 0 && <div className="text-gray-400">No matching items found.</div>}
              {filteredTree
                .slice()
                .sort((a, b) => {
                  if (!a.group_name || !b.group_name) return 0;
                  if (mainGroupSortAsc) {
                    return a.group_name.localeCompare(b.group_name);
                  } else {
                    return b.group_name.localeCompare(a.group_name);
                  }
                })
                .map(group => renderGroup(group))}
            </div>
          )}
        </div>
        {/* Main Group Modal */}
        {showGroupForm && (
          <NewGroupForm
            onClose={() => setShowGroupForm(false)}
            onSuccess={() => setRefreshFlag(f => f + 1)}
          />
        )}
        {/* Subgroup Modal */}
        {showSubgroupForm && (
          <NewGroupForm
            onClose={() => setShowSubgroupForm(null)}
            onSuccess={() => setRefreshFlag(f => f + 1)}
            parentId={showSubgroupForm.parentId}
          />
        )}
        {/* Material Modal */}
        {showMaterialForm && (
          <NewMaterialForm
            inventory={[]}
            onAddMaterial={mat => handleAddMaterial(mat, showMaterialForm.groupId)}
            onClose={() => setShowMaterialForm(null)}
          />
        )}
        <DeleteConfirmationDialog
          isOpen={!!groupToDelete}
          title="Delete Group"
          message={`Are you sure you want to delete the group '${groupToDelete?.name}' (ID: ${groupToDelete?.id})? This action cannot be undone.`}
          isDeleting={!!deleteGroupLoading}
          onConfirm={() => groupToDelete && handleDeleteGroup(groupToDelete.id)}
          onCancel={() => setGroupToDelete(null)}
        />
        {/* Toast/alert for feedback */}
        {message && (
          <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50">
            {message}
            <button className="ml-2 text-white font-bold" onClick={() => setMessage(null)}>&times;</button>
          </div>
        )}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg z-50">
            {error}
            <button className="ml-2 text-white font-bold" onClick={() => setError(null)}>&times;</button>
          </div>
        )}
        <StockAdjustModal
          isOpen={showStockModal}
          mode={stockModalMode}
          materialName={selectedMaterial?.name || ''}
          unit={selectedMaterial?.unit || ''}
          isProcessing={isStockProcessing}
          onConfirm={handleStockModalConfirm}
          onCancel={handleStockModalCancel}
          showSupplierInput={stockModalMode === 'add'}
        />
        {/* Defective Adjust Modal */}
        <StockAdjustModal
          isOpen={showDefectiveModal}
          mode={defectiveModalMode}
          materialName={selectedDefectiveMaterial?.name || ''}
          unit={selectedDefectiveMaterial?.unit || ''}
          isProcessing={isDefectiveProcessing}
          onConfirm={handleDefectiveModalConfirm}
          onCancel={handleDefectiveModalCancel}
          showSupplierInput={false}
        />
        <DeleteConfirmationDialog
          isOpen={showDeleteDialog}
          title="Delete Material"
          message={`Are you sure you want to delete '${materialToDelete?.name}'? This action cannot be undone.`}
          isDeleting={isDeletingMaterial}
          onConfirm={handleConfirmDelete}
          onCancel={() => { setShowDeleteDialog(false); setMaterialToDelete(null); }}
        />
        {showRemarksModal && remarksMaterial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6 relative border border-gray-200 dark:border-gray-700">
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                onClick={closeRemarksModal}
                aria-label="Close"
              >
                ×
              </button>
              <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Remarks for {remarksMaterial.name}</h2>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSaveRemark();
                }}
                className="mb-4"
              >
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Write Remarks</label>
                <textarea
                  className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 min-h-[60px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={remarksInput}
                  onChange={e => setRemarksInput(e.target.value)}
                  placeholder="Enter remarks..."
                  disabled={remarksLoading}
                  rows={3}
                />
                <button
                  type="submit"
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                  disabled={!remarksInput.trim() || remarksLoading}
                >
                  {remarksLoading ? 'Saving...' : 'Save'}
                </button>
              </form>
              <div className="mb-2 flex items-center gap-2">
                <span className="font-medium text-gray-700 dark:text-gray-300">View Remarks</span>
                <button
                  type="button"
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm text-gray-800 dark:text-gray-200"
                  onClick={handleViewRemark}
                  disabled={remarksLoading}
                >
                  {remarksLoading ? 'Loading...' : 'View'}
                </button>
              </div>
              {remarksError && <div className="text-red-500 text-sm mb-2">{remarksError}</div>}
              {viewedRemark && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-3 mt-2 border border-gray-100 dark:border-gray-600">
                  <div className="text-gray-800 dark:text-gray-200 whitespace-pre-line">{viewedRemark.description}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    By {viewedRemark.username} on {viewedRemark.created_at}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default GroupTree; 