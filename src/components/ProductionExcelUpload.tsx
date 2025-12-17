import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, X, AlertTriangle, CheckCircle, Loader2, FileSpreadsheet, ChevronDown, ChevronRight, Search, Link as LinkIcon, Maximize2, Minimize2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { axiosInstance } from '../utils/axiosInstance';
import { useFuzzySearch } from '../hooks/useFuzzySearch';

interface ParsedMaterial {
    name: string;
    quantity: number;
    isValid: boolean;
    matchedStockId?: string;
    matchedStockName?: string;
}

interface ParsedBed {
    id: string; // Temporary ID for list management
    name: string;
    materials: ParsedMaterial[];
    labourCost: number;
    transportCost: number;
    otherCost: number;
    wastagePercent: number;
    isValid: boolean;
    validationErrors: string[];
    status: 'pending' | 'uploading' | 'success' | 'error';
    errorMessage?: string;
}

interface ProductionExcelUploadProps {
    onUploadComplete: () => void;
}

export const ProductionExcelUpload: React.FC<ProductionExcelUploadProps> = ({ onUploadComplete }) => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [parsedBeds, setParsedBeds] = useState<ParsedBed[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [expandedBedId, setExpandedBedId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Manual Mapping State
    const [mappingBedId, setMappingBedId] = useState<string | null>(null);
    const [mappingMatIndex, setMappingMatIndex] = useState<number | null>(null);

    // Fuzzy Search
    const { query: mappingQuery, setQuery: setMappingQuery, filteredData } = useFuzzySearch(inventory, ['name', 'item_name', 'item_id', 'id']);
    // Taking top 50 matches
    const filteredInventory = filteredData.slice(0, 50);

    // Helper to flatten the group tree structure from fetchAllStocks
    // No longer needed if using flat list from /api/stock/inventory/
    // but kept just in case structure needs adjustment.

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsing(true);
        setIsOpen(true);
        setParsedBeds([]);
        setMappingBedId(null);
        setMappingMatIndex(null);

        try {
            // 1. Fetch Inventory for Validation
            let currentInventory: any[] = [];
            try {
                const response = await axiosInstance.post('/api/stock/inventory/', {});

                // Robustly find the array in the response
                const data = response.data;
                if (Array.isArray(data)) {
                    currentInventory = data;
                } else if (data && typeof data === 'object') {
                    if (Array.isArray(data.data)) currentInventory = data.data;
                    else if (Array.isArray(data.results)) currentInventory = data.results;
                    else if (Array.isArray(data.items)) currentInventory = data.items;
                    else if (Array.isArray(data.inventory)) currentInventory = data.inventory;
                }

                console.log("Fetched Inventory for Validation:", currentInventory); // Debug log
                setInventory(currentInventory);
            } catch (err) {
                console.error("Failed to fetch inventory for validation", err);
            }

            // 2. Read Excel File
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

            // 3. Parse Rows
            const beds = parseExcelData(jsonData, currentInventory);
            setParsedBeds(beds);

        } catch (error) {
            console.error("Error parsing excel", error);
            alert("Failed to parse Excel file. Please check the format.");
        } finally {
            setIsParsing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const parseExcelData = (rows: any[][], inventoryList: any[]): ParsedBed[] => {
        const beds: ParsedBed[] = [];
        let currentBed: Partial<ParsedBed> | null = null;
        let currentMaterials: ParsedMaterial[] = [];

        // Default indices if headers not found (fallback)
        let matColIndex = 2; // Column C
        let qtyColIndex = 3; // Column D
        let rateColIndex = 4; // Column E

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            // Check for Header Row
            const matNameIdx = row.findIndex(cell => String(cell).toLowerCase().includes('material name'));

            if (matNameIdx !== -1) {
                // Found a header row, update indices
                matColIndex = matNameIdx;

                // Try to find Quantity column
                const qtyIdx = row.findIndex(cell =>
                    String(cell).toLowerCase().includes('quantity') ||
                    String(cell).toLowerCase().includes('qty')
                );
                if (qtyIdx !== -1) qtyColIndex = qtyIdx;

                // Try to find Rate column
                const rateIdx = row.findIndex(cell =>
                    String(cell).toLowerCase().includes('rate')
                );
                if (rateIdx !== -1) rateColIndex = rateIdx;

                // Save previous bed if exists
                if (currentBed && currentMaterials.length > 0) {
                    validateAndPushBed(currentBed, currentMaterials, beds);
                }

                // Start New Bed using name from previous row similar to before
                let name = `Bed ${beds.length + 1}`;
                if (i > 0) {
                    const prevRow = rows[i - 1];
                    const titleCandidates = prevRow.filter(c => c && String(c).trim().length > 0);
                    if (titleCandidates.length > 0) {
                        name = String(titleCandidates[0]).trim();
                    }
                }

                currentBed = {
                    id: Math.random().toString(36).substr(2, 9),
                    name: name,
                    labourCost: 0,
                    transportCost: 0,
                    otherCost: 0,
                    wastagePercent: 0,
                    status: 'pending'
                };
                currentMaterials = [];
                continue; // Skip header row
            }

            // If we are inside a bed block, read materials
            if (currentBed) {
                if (row.some(c => String(c).toUpperCase().includes('TOTAL'))) {
                    validateAndPushBed(currentBed, currentMaterials, beds);
                    currentBed = null;
                    currentMaterials = [];
                    continue;
                }

                const matName = row[matColIndex];
                const qty = row[qtyColIndex];

                if (!matName && !qty) continue;

                if (matName && qty !== undefined) {
                    const nameStr = String(matName).trim();
                    const qtyNum = parseFloat(qty);

                    if (nameStr.toUpperCase().includes('LABOUR')) {
                        // Use rate col or calculate
                        // If rate col is valid number use it, else fallback
                        const rate = parseFloat(row[rateColIndex] || row[qtyColIndex + 1] || '0');
                        if (currentBed) currentBed.labourCost = (currentBed.labourCost || 0) + (qtyNum * rate);
                    } else if (nameStr.toUpperCase().includes('TRANSPORT')) {
                        const rate = parseFloat(row[rateColIndex] || row[qtyColIndex + 1] || '0');
                        if (currentBed) currentBed.transportCost = (currentBed.transportCost || 0) + (qtyNum * rate);
                    } else if (nameStr.toUpperCase().includes('WASTAGE')) {
                        // ignore
                    } else {
                        // Normal Material
                        const normalizedName = nameStr.toLowerCase().replace(/\s+/g, '');
                        const matchedItem = inventoryList.find(item => {
                            const itemName = item.name || item.item_name || item.item_id || "";

                            return itemName.toLowerCase().replace(/\s+/g, '') === normalizedName ||
                                itemName.toLowerCase().includes(normalizedName) ||
                                normalizedName.includes(itemName.toLowerCase()) ||
                                (item.item_id && item.item_id.toLowerCase().replace(/\s+/g, '') === normalizedName)
                        });

                        // Check for item_id or id
                        const matchedId = matchedItem ? (matchedItem.id || matchedItem.item_id) : undefined;
                        const matchedName = matchedItem ? (matchedItem.name || matchedItem.item_name) : undefined;

                        currentMaterials.push({
                            name: nameStr,
                            quantity: qtyNum,
                            isValid: !!matchedItem,
                            matchedStockId: matchedId,
                            matchedStockName: matchedName
                        });
                    }
                }
            }
        }

        // Push last bed if exists (EOF case)
        if (currentBed && currentMaterials.length > 0) {
            validateAndPushBed(currentBed, currentMaterials, beds);
        }

        return beds;
    };

    const validateAndPushBed = (
        bed: Partial<ParsedBed>,
        materials: ParsedMaterial[],
        list: ParsedBed[]
    ) => {
        const errors: string[] = [];

        // Filter out valid materials
        const validMaterials = materials.filter(m => m.quantity > 0 && !isNaN(m.quantity));
        if (validMaterials.length === 0) errors.push("No valid materials found.");

        const invalidStock = validMaterials.filter(m => !m.isValid);
        // if (invalidStock.length > 0) errors.push(`${invalidStock.length} materials not found in inventory.`);

        // We set isValid to false if there are CRITICAL errors.
        // Missing inventory match IS critical as we can't deduct stock.
        const isCriticalError = invalidStock.length > 0 || errors.length > 0;

        const fullBed: ParsedBed = {
            id: bed.id!,
            name: bed.name || "Unknown Bed",
            materials: validMaterials,
            labourCost: bed.labourCost || 0,
            transportCost: bed.transportCost || 0,
            otherCost: bed.otherCost || 0,
            wastagePercent: bed.wastagePercent || 0, // Default 0 for now
            isValid: !isCriticalError,
            validationErrors: errors,
            status: 'pending'
        };
        list.push(fullBed);
    };

    const startMapping = (bedId: string, matIndex: number, currentName: string) => {
        setMappingBedId(bedId);
        setMappingMatIndex(matIndex);
        setMappingQuery(currentName); // Pre-fill with Excel name
    };

    const handleMapSelect = (stockItem: any) => {
        if (!mappingBedId || mappingMatIndex === null) return;

        const itemName = stockItem.name || stockItem.item_name || stockItem.item_id;
        const itemId = stockItem.id || stockItem.item_id;

        // Identify the raw name we are mapping
        // We find it from the current bed using the index
        const currentBed = parsedBeds.find(b => b.id === mappingBedId);
        if (!currentBed) return;
        const targetRawName = currentBed.materials[mappingMatIndex].name.trim().toLowerCase();

        setParsedBeds(prev => prev.map(bed => {
            // We want to check EVERY bed, not just the current one
            // Check if this bed has any material matching the targetRawName
            const hasMatch = bed.materials.some(m => m.name.trim().toLowerCase() === targetRawName);

            if (!hasMatch) return bed;

            const updatedMaterials = bed.materials.map(m => {
                if (m.name.trim().toLowerCase() === targetRawName) {
                    return {
                        ...m,
                        isValid: true,
                        matchedStockId: itemId,
                        matchedStockName: itemName
                    };
                }
                return m;
            });

            // Re-validate bed
            const invalidCount = updatedMaterials.filter(m => !m.isValid).length;
            const updatedBed = {
                ...bed,
                materials: updatedMaterials,
                isValid: invalidCount === 0 && bed.validationErrors.filter(e => e !== "No valid materials found.").length === 0
            };

            return updatedBed;
        }));

        // Reset mapping
        setMappingBedId(null);
        setMappingMatIndex(null);
        setMappingQuery('');
    };

    const closeMapping = () => {
        setMappingBedId(null);
        setMappingMatIndex(null);
    };

    const handleCostUpdate = (bedId: string, field: 'labourCost' | 'transportCost' | 'otherCost' | 'wastagePercent', value: string) => {
        const numValue = parseFloat(value) || 0;
        setParsedBeds(prev => prev.map(bed => {
            if (bed.id !== bedId) return bed;
            return {
                ...bed,
                [field]: numValue
            };
        }));
    };

    const handleQuantityUpdate = (bedId: string, matIndex: number, value: string) => {
        const numValue = parseFloat(value) || 0;
        setParsedBeds(prev => prev.map(bed => {
            if (bed.id !== bedId) return bed;
            const updatedMaterials = [...bed.materials];
            updatedMaterials[matIndex] = {
                ...updatedMaterials[matIndex],
                quantity: numValue
            };
            return {
                ...bed,
                materials: updatedMaterials
            };
        }));
    };

    // Filter inventory for mapping - REPLACED BY FUZZY SEARCH
    // const filteredInventory = inventory.filter(item => {
    //     if (!mappingQuery) return true;
    //     const q = mappingQuery.toLowerCase();
    //     const name = (item.name || item.item_name || "").toLowerCase();
    //     const id = (item.id || item.item_id || "").toLowerCase();
    //     return name.includes(q) || id.includes(q);
    // }).slice(0, 50); // Limit to 50 suggestions

    const MAX_BATCH_SIZE = 20;

    const handleUpload = async () => {
        setIsUploading(true);
        let bedsToProcess = parsedBeds.filter(b => b.status !== 'success' && b.isValid);

        // Limit the batch
        if (bedsToProcess.length > MAX_BATCH_SIZE) {
            bedsToProcess = bedsToProcess.slice(0, MAX_BATCH_SIZE);
        }

        // Sequential Process
        for (const bed of bedsToProcess) {
            // Update UI to 'uploading'
            setParsedBeds(prev => prev.map(p => p.id === bed.id ? { ...p, status: 'uploading' } : p));

            try {
                // Construct Payload matching /api/production/create/
                const stockNeeded: { [key: string]: string } = {};
                bed.materials.forEach(m => {
                    // Use matched name if available to ensure backend finds it?
                    // Or backend uses exact name from payload?
                    // Usually safer to use the EXACT name from our inventory if we matched it.
                    const finalName = m.matchedStockName || m.name;
                    stockNeeded[finalName] = String(m.quantity);
                });

                const payload = {
                    product_name: bed.name,
                    stock_needed: stockNeeded,
                    username: user.username,
                    wastage_percent: bed.wastagePercent,
                    transport_cost: bed.transportCost,
                    labour_cost: bed.labourCost,
                    other_cost: bed.otherCost
                };

                const response = await axiosInstance.post('/api/production/create/', payload);

                if (response.data && response.data.message === "Product created successfully") {
                    setParsedBeds(prev => prev.map(p => p.id === bed.id ? { ...p, status: 'success' } : p));
                } else {
                    throw new Error(response.data.message || "Unknown error");
                }

            } catch (err: any) {
                console.error(`Failed to upload ${bed.name}`, err);
                const msg = err.response?.data?.message || err.message || "Upload failed";
                setParsedBeds(prev => prev.map(p => p.id === bed.id ? {
                    ...p,
                    status: 'error',
                    errorMessage: msg
                } : p));
            }
        }

        setIsUploading(false);
        // Refresh parent
        onUploadComplete();
    };

    const handleRemoveBed = (id: string) => {
        setParsedBeds(prev => prev.filter(b => b.id !== id));
    };

    if (!isOpen) {
        return (
            <>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center px-4 md:px-5 py-2.5 bg-white text-green-600 dark:text-green-500 rounded-xl font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 text-sm md:text-base whitespace-nowrap border border-green-100 dark:border-green-900"
                >
                    <FileSpreadsheet className="h-5 w-5 mr-2" />
                    Upload via Excel
                </button>
                <input
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                />
            </>
        );
    }

    const validCount = parsedBeds.filter(b => b.isValid).length;
    const invalidCount = parsedBeds.filter(b => !b.isValid).length;
    const isAllSuccess = parsedBeds.every(b => b.status === 'success');
    const uploadCount = Math.min(validCount, MAX_BATCH_SIZE);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className={`bg-white dark:bg-gray-800 shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700 transition-all duration-300
                ${isFullScreen
                    ? 'fixed inset-0 w-full h-full rounded-none'
                    : 'rounded-2xl w-full max-w-4xl max-h-[90vh]'
                }
            `}>
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FileSpreadsheet className="text-green-600" /> Excel Upload Preview
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Found {parsedBeds.length} beds. {validCount} valid, {invalidCount} needing attention.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsFullScreen(!isFullScreen)}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400"
                            title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                        >
                            {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                        </button>
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-gray-900/50">
                    {isParsing ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
                            <p className="text-gray-500 font-medium">Parsing Excel file...</p>
                        </div>
                    ) : parsedBeds.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            No beds found in the file. Please check the format.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {parsedBeds.map((bed, idx) => (
                                <div key={bed.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 overflow-hidden transition-all duration-200
                                    ${bed.status === 'success' ? 'border-green-200 dark:border-green-900' :
                                        bed.status === 'error' ? 'border-red-200 dark:border-red-900' :
                                            !bed.isValid ? 'border-yellow-200 dark:border-yellow-900' : 'border-transparent hover:border-indigo-200 dark:hover:border-indigo-800'
                                    }`}>

                                    {/* Bed Header Row */}
                                    <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                                        onClick={() => setExpandedBedId(expandedBedId === bed.id ? null : bed.id)}>

                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 font-bold text-xs">
                                            {idx + 1}
                                        </div>

                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                                                {bed.name}
                                                {bed.status === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                                                {bed.status === 'error' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                                                {bed.status === 'uploading' && <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />}
                                            </h3>
                                            <div className="flex gap-4 text-xs text-gray-500 mt-1">
                                                <span>Materials: {bed.materials.length}</span>
                                                {/* <span>Est. Cost: ₹{(bed.labourCost + bed.transportCost + bed.otherCost).toFixed(2)} + materials</span> */}
                                            </div>
                                            {bed.errorMessage && (
                                                <div className="text-xs text-red-500 mt-1 font-medium">{bed.errorMessage}</div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {!bed.isValid && (
                                                <div className="flex items-center px-3 py-1 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg text-xs font-medium">
                                                    <AlertTriangle className="w-3 h-3 mr-1.5" />
                                                    Review Needed
                                                </div>
                                            )}
                                            {expandedBedId === bed.id ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {expandedBedId === bed.id && (
                                        <div className="border-t border-gray-100 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Costs</span>
                                                    <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-gray-700 dark:text-gray-300">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-xs font-medium">Labour</span>
                                                            <input
                                                                type="number"
                                                                value={bed.labourCost}
                                                                onChange={(e) => handleCostUpdate(bed.id, 'labourCost', e.target.value)}
                                                                className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-xs font-medium">Transport</span>
                                                            <input
                                                                type="number"
                                                                value={bed.transportCost}
                                                                onChange={(e) => handleCostUpdate(bed.id, 'transportCost', e.target.value)}
                                                                className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-xs font-medium">Other</span>
                                                            <input
                                                                type="number"
                                                                value={bed.otherCost}
                                                                onChange={(e) => handleCostUpdate(bed.id, 'otherCost', e.target.value)}
                                                                className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-xs font-medium">Wastage %</span>
                                                            <input
                                                                type="number"
                                                                value={bed.wastagePercent}
                                                                onChange={(e) => handleCostUpdate(bed.id, 'wastagePercent', e.target.value)}
                                                                className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-end justify-end">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRemoveBed(bed.id); }}
                                                        disabled={bed.status === 'success' || bed.status === 'uploading'}
                                                        className="text-red-500 text-sm hover:underline disabled:opacity-50"
                                                    >
                                                        Remove this bed
                                                    </button>
                                                </div>
                                            </div>

                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-gray-500 uppercase bg-gray-100 dark:bg-gray-700/50">
                                                    <tr>
                                                        <th className="px-3 py-2 rounded-l-lg">Material Name (Excel)</th>
                                                        <th className="px-3 py-2">Matched Inventory</th>
                                                        <th className="px-3 py-2 rounded-r-lg text-right">Qty</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                    {bed.materials.map((m, mi) => (
                                                        <tr key={mi} className="hover:bg-white dark:hover:bg-gray-700 transition-colors">
                                                            <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                                                                {m.name}
                                                            </td>
                                                            <td className="px-3 py-2 relative">
                                                                {mappingBedId === bed.id && mappingMatIndex === mi ? (
                                                                    <div className="relative">
                                                                        <div className="flex items-center gap-2">
                                                                            <input
                                                                                type="text"
                                                                                autoFocus
                                                                                className="w-full px-2 py-1 text-sm border border-indigo-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                                                                                placeholder="Search material..."
                                                                                value={mappingQuery}
                                                                                onChange={(e) => setMappingQuery(e.target.value)}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            />
                                                                            <button onClick={closeMapping} className="p-1 text-gray-500 hover:text-gray-700">
                                                                                <X className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                        {/* Dropdown Results */}
                                                                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                                                            {filteredInventory.length > 0 ? (
                                                                                filteredInventory.map(item => (
                                                                                    <div
                                                                                        key={item.id || item.item_id}
                                                                                        className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-200 flex justify-between"
                                                                                        onClick={(e) => { e.stopPropagation(); handleMapSelect(item); }}
                                                                                    >
                                                                                        <span>{item.name || item.item_name}</span>
                                                                                        {/* <span className="text-xs text-gray-500">{item.available} avail</span> */}
                                                                                    </div>
                                                                                ))
                                                                            ) : (
                                                                                <div className="px-3 py-2 text-sm text-gray-400">No matches found</div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ) : m.isValid ? (
                                                                    <span className="flex items-center text-green-600 dark:text-green-400 group">
                                                                        <CheckCircle className="w-3 h-3 mr-1.5" />
                                                                        {m.matchedStockName}
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); startMapping(bed.id, mi, m.name); }}
                                                                            className="ml-2 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-indigo-600 transition-opacity"
                                                                            title="Change mapping"
                                                                        >
                                                                            <LinkIcon className="w-3 h-3" />
                                                                        </button>
                                                                    </span>
                                                                ) : (
                                                                    <div className="flex items-center">
                                                                        <span className="flex items-center text-red-500 mr-2">
                                                                            <AlertTriangle className="w-3 h-3 mr-1.5" />
                                                                            Not Found
                                                                        </span>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); startMapping(bed.id, mi, m.name); }}
                                                                            className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs rounded hover:bg-indigo-100 transition-colors flex items-center"
                                                                        >
                                                                            <Search className="w-3 h-3 mr-1" />
                                                                            Map
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2 text-right font-mono">
                                                                <input
                                                                    type="number"
                                                                    value={m.quantity}
                                                                    onChange={(e) => handleQuantityUpdate(bed.id, mi, e.target.value)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="w-20 px-2 py-1 text-sm text-right bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-2xl flex justify-between items-center">
                    <button
                        onClick={() => setIsOpen(false)}
                        disabled={isUploading}
                        className="px-6 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                    >
                        {isAllSuccess ? "Close" : "Cancel"}
                    </button>

                    {!isAllSuccess && (
                        <div className="flex flex-col items-end gap-2">
                            {validCount > MAX_BATCH_SIZE && (
                                <span className="text-xs text-amber-600 font-medium">
                                    Limit: {MAX_BATCH_SIZE} beds per batch. (+{validCount - MAX_BATCH_SIZE} remaining)
                                </span>
                            )}
                            <button
                                onClick={handleUpload}
                                disabled={isUploading || validCount === 0}
                                className={`px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2
                                    ${(isUploading || validCount === 0) ? 'opacity-50 cursor-not-allowed transform-none' : ''}
                                `}
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5" />
                                        Upload {uploadCount} Beds
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
