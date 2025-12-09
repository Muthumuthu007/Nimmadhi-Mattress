import React, { useState } from 'react';
import { format } from 'date-fns';
import { FilePlus2, Download, Loader2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { createGrn, CreateGrnResponse, getGrnById, GrnRecord, getGrnByTransport, getGrnBySupplier, deleteGrn, getAllGrns } from '../utils/grnApi';
import QuickAddInput from '../components/QuickAddInput';


interface GrnFormState {
  date: string;
  supplierName: string;
  rawMaterial: string;
  billNumber: string;
  billDate: string;
  billedQuantity: string;
  receivedQuantity: string;
  transport: string;
  tallyReference: string;
  costing: string;
  taxPercentage: string;
  sgstAmount: string;
  cgstAmount: string;
  igstAmount: string;
  totalAmount: string;
}

const initialFormState: GrnFormState = {
  date: '',
  supplierName: '',
  rawMaterial: '',
  billNumber: '',
  billDate: '',
  billedQuantity: '',
  receivedQuantity: '',
  transport: '',
  tallyReference: '',
  costing: '',
  taxPercentage: '',
  sgstAmount: '',
  cgstAmount: '',
  igstAmount: '',
  totalAmount: '',
};

const GRN: React.FC = () => {
  const [formData, setFormData] = useState<GrnFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createdRecord, setCreatedRecord] = useState<CreateGrnResponse | null>(null);
  const [grnLookupId, setGrnLookupId] = useState('');
  const [lookupResult, setLookupResult] = useState<GrnRecord | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [transportQuery, setTransportQuery] = useState('');
  const [transportResults, setTransportResults] = useState<GrnRecord[]>([]);
  const [transportError, setTransportError] = useState<string | null>(null);
  const [isLoadingTransport, setIsLoadingTransport] = useState(false);
  const [supplierQuery, setSupplierQuery] = useState('');
  const [supplierResults, setSupplierResults] = useState<GrnRecord[]>([]);
  const [supplierError, setSupplierError] = useState<string | null>(null);
  const [isLoadingSupplier, setIsLoadingSupplier] = useState(false);
  const [allGrns, setAllGrns] = useState<GrnRecord[]>([]);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [allError, setAllError] = useState<string | null>(null);
  const [deletingGrnId, setDeletingGrnId] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  // Dropdown states - all closed by default
  const [isCreateGrnOpen, setIsCreateGrnOpen] = useState(false);
  const [isLookupByIdOpen, setIsLookupByIdOpen] = useState(false);
  const [isTransportSearchOpen, setIsTransportSearchOpen] = useState(false);
  const [isSupplierSearchOpen, setIsSupplierSearchOpen] = useState(false);
  const [isAllGrnsOpen, setIsAllGrnsOpen] = useState(false);

  const handleScrollToForm = () => {
    document.getElementById('create-grn-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleFieldChange = (field: keyof GrnFormState, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const handleCreateGrn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setCreateError(null);
    setCreateSuccess(null);

    const payload = {
      date: formData.date,
      supplierName: formData.supplierName.trim(),
      rawMaterial: formData.rawMaterial.trim(),
      billNumber: formData.billNumber.trim(),
      billDate: formData.billDate,
      billedQuantity: toNumber(formData.billedQuantity),
      receivedQuantity: toNumber(formData.receivedQuantity),
      transport: formData.transport.trim(),
      tallyReference: formData.tallyReference.trim(),
      costing: toNumber(formData.costing),
      taxPercentage: toNumber(formData.taxPercentage),
      sgstAmount: toNumber(formData.sgstAmount),
      cgstAmount: toNumber(formData.cgstAmount),
      igstAmount: toNumber(formData.igstAmount),
      totalAmount: toNumber(formData.totalAmount),
    };

    try {
      const response = await createGrn(payload);
      setCreateSuccess(response.message || 'GRN created successfully');
      setCreatedRecord(response);
      setFormData(initialFormState);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create GRN');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLookupGrn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!grnLookupId.trim()) return;
    setIsLookingUp(true);
    setLookupError(null);
    setLookupResult(null);
    try {
      const result = await getGrnById(grnLookupId.trim());
      setLookupResult(result);
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : 'Failed to fetch GRN');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleTransportSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!transportQuery.trim()) return;
    setIsLoadingTransport(true);
    setTransportError(null);
    setTransportResults([]);
    try {
      const results = await getGrnByTransport(transportQuery.trim());
      setTransportResults(results);
    } catch (error) {
      setTransportError(error instanceof Error ? error.message : 'Failed to fetch GRNs by transport');
    } finally {
      setIsLoadingTransport(false);
    }
  };

  const handleSupplierSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supplierQuery.trim()) return;
    setIsLoadingSupplier(true);
    setSupplierError(null);
    setSupplierResults([]);
    try {
      const results = await getGrnBySupplier(supplierQuery.trim());
      setSupplierResults(results);
    } catch (error) {
      setSupplierError(error instanceof Error ? error.message : 'Failed to fetch GRNs by supplier');
    } finally {
      setIsLoadingSupplier(false);
    }
  };

  const handleDeleteGrn = async (grnId: string) => {
    if (!window.confirm(`Delete GRN ${grnId}? This cannot be undone.`)) {
      return;
    }
    setDeletingGrnId(grnId);
    setDeleteSuccess(null);
    try {
      await deleteGrn(grnId);
      setDeleteSuccess(`GRN ${grnId} deleted successfully`);
      // Remove the deleted GRN from the list
      setAllGrns(prev => prev.filter(grn => grn.grnId !== grnId));
      // Clear success message after 3 seconds
      setTimeout(() => {
        setDeleteSuccess(null);
      }, 3000);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete GRN');
    } finally {
      setDeletingGrnId(null);
    }
  };

  const handleFetchAllGrns = async () => {
    setIsLoadingAll(true);
    setAllError(null);
    try {
      const results = await getAllGrns();
      setAllGrns(results);
    } catch (error) {
      setAllError(error instanceof Error ? error.message : 'Failed to fetch GRNs');
    } finally {
      setIsLoadingAll(false);
    }
  };

  const handleExportToExcel = () => {
    if (allGrns.length === 0) {
      alert('No GRN data available to export. Please fetch GRN records first.');
      return;
    }

    // Prepare data with the same column order as the table
    const exportData = allGrns.map((record, index) => ({
      'Serial no': index + 1,
      'Date': record.date ? format(new Date(record.date), 'dd MMM yyyy') : '—',
      'Supplier Name': record.supplierName,
      'Material': record.rawMaterial,
      'Bill Number': record.billNumber,
      'Bill Date': record.billDate ? format(new Date(record.billDate), 'dd MMM yyyy') : '—',
      'Billed Qty': record.billedQuantity,
      'Received Qty': record.receivedQuantity,
      'Transport': record.transport,
      'Tally': record.tallyReference,
      'SGST': record.sgstAmount,
      'CGST': record.cgstAmount,
      'IGST': record.igstAmount,
      'Total': record.totalAmount,
    }));

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'GRN Records');

    // Set column widths for better readability
    const colWidths = [
      { wch: 10 }, // Serial no
      { wch: 12 }, // Date
      { wch: 25 }, // Supplier Name
      { wch: 20 }, // Material
      { wch: 15 }, // Bill Number
      { wch: 12 }, // Bill Date
      { wch: 12 }, // Billed Qty
      { wch: 13 }, // Received Qty
      { wch: 15 }, // Transport
      { wch: 18 }, // Tally
      { wch: 12 }, // SGST
      { wch: 12 }, // CGST
      { wch: 12 }, // IGST
      { wch: 15 }, // Total
    ];
    ws['!cols'] = colWidths;

    // Generate filename with current date
    const fileName = `GRN_Records_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`;

    // Write and download file
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 dark:from-green-800 dark:via-emerald-800 dark:to-teal-800 rounded-2xl shadow-xl p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-green-100 dark:text-green-200 font-semibold">Inbound Logistics</p>
            <h1 className="text-3xl md:text-4xl font-bold text-white mt-1">Goods Receipt Notes</h1>
            <p className="text-green-100 dark:text-green-200 text-sm md:text-base mt-1">Track every incoming material batch and its QC status.</p>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-3">
            <button
              type="button"
              onClick={handleScrollToForm}
              className="inline-flex items-center px-4 md:px-5 py-2.5 bg-white text-green-600 dark:text-green-700 rounded-xl font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
              <FilePlus2 className="w-4 h-4 mr-2" />
              New GRN
            </button>
            <button className="inline-flex items-center px-4 md:px-5 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-xl font-medium shadow-lg hover:bg-white/30 hover:shadow-xl hover:scale-105 transition-all duration-200">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Create GRN Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden" id="create-grn-form">
        <button
          type="button"
          onClick={() => setIsCreateGrnOpen(!isCreateGrnOpen)}
          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between hover:from-indigo-700 hover:to-indigo-800 transition-all"
        >
          <div className="text-left">
            <h2 className="text-2xl font-bold text-white">Create New GRN</h2>
            <p className="text-sm text-indigo-100 dark:text-indigo-200 mt-1">Register incoming goods receipt with complete details</p>
          </div>
          {isCreateGrnOpen ? (
            <ChevronUp className="h-6 w-6 text-white" />
          ) : (
            <ChevronDown className="h-6 w-6 text-white" />
          )}
        </button>

        {isCreateGrnOpen && (
          <div className="p-6">
            {createError && (
              <div className="mb-6 rounded-lg border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                <strong>Error:</strong> {createError}
              </div>
            )}
            {createSuccess && (
              <div className="mb-6 rounded-lg border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm text-green-700 dark:text-green-400">
                <strong>Success:</strong> {createSuccess}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleCreateGrn}>
              {/* Basic Information Section */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="grn-date">GRN Date *</label>
                    <input
                      type="date"
                      id="grn-date"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      value={formData.date}
                      onChange={(e) => handleFieldChange('date', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <QuickAddInput
                      label="Supplier Name"
                      id="grn-supplier"
                      value={formData.supplierName}
                      onChange={(value) => handleFieldChange('supplierName', value)}
                      storageKey="grn_suppliers"
                      placeholder="ABC Suppliers Ltd"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="grn-raw-material">Raw Material *</label>
                    <input
                      type="text"
                      id="grn-raw-material"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                      value={formData.rawMaterial}
                      onChange={(e) => handleFieldChange('rawMaterial', e.target.value)}
                      placeholder="Steel Rods"
                      required
                    />
                  </div>
                  <div>
                    <QuickAddInput
                      label="Transport"
                      id="grn-transport"
                      value={formData.transport}
                      onChange={(value) => handleFieldChange('transport', value)}
                      storageKey="grn_transports"
                      placeholder="Van"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Bill Details Section */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Bill Details</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="grn-bill-number">Bill Number *</label>
                    <input
                      type="text"
                      id="grn-bill-number"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                      value={formData.billNumber}
                      onChange={(e) => handleFieldChange('billNumber', e.target.value)}
                      placeholder="BILL-2024-001"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="grn-bill-date">Bill Date *</label>
                    <input
                      type="date"
                      id="grn-bill-date"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      value={formData.billDate}
                      onChange={(e) => handleFieldChange('billDate', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="grn-tally-ref">Tally Reference *</label>
                    <input
                      type="text"
                      id="grn-tally-ref"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                      value={formData.tallyReference}
                      onChange={(e) => handleFieldChange('tallyReference', e.target.value)}
                      placeholder="TALLY-REF-001"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Quantity & Costing Section */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quantity & Costing</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="grn-billed-qty">Billed Quantity *</label>
                    <input
                      type="number"
                      id="grn-billed-qty"
                      step="0.01"
                      min="0"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      value={formData.billedQuantity}
                      onChange={(e) => handleFieldChange('billedQuantity', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="grn-received-qty">Received Quantity *</label>
                    <input
                      type="number"
                      id="grn-received-qty"
                      step="0.01"
                      min="0"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      value={formData.receivedQuantity}
                      onChange={(e) => handleFieldChange('receivedQuantity', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="grn-costing">Costing (₹) *</label>
                    <input
                      type="number"
                      id="grn-costing"
                      step="0.01"
                      min="0"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      value={formData.costing}
                      onChange={(e) => handleFieldChange('costing', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Tax & Total Section */}
              <div className="pb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tax & Total Amount</h3>
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <QuickAddInput
                      label="Tax %"
                      id="grn-tax"
                      type="number"
                      value={formData.taxPercentage}
                      onChange={(value) => handleFieldChange('taxPercentage', value)}
                      storageKey="grn_tax_percentages"
                      required
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div>
                    <QuickAddInput
                      label="SGST (₹)"
                      id="grn-sgst"
                      type="number"
                      value={formData.sgstAmount}
                      onChange={(value) => handleFieldChange('sgstAmount', value)}
                      storageKey="grn_sgst_values"
                      required
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div>
                    <QuickAddInput
                      label="CGST (₹)"
                      id="grn-cgst"
                      type="number"
                      value={formData.cgstAmount}
                      onChange={(value) => handleFieldChange('cgstAmount', value)}
                      storageKey="grn_cgst_values"
                      required
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div>
                    <QuickAddInput
                      label="IGST (₹)"
                      id="grn-igst"
                      type="number"
                      value={formData.igstAmount}
                      onChange={(value) => handleFieldChange('igstAmount', value)}
                      storageKey="grn_igst_values"
                      required
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="grn-total">Total Amount (₹) *</label>
                    <input
                      type="number"
                      id="grn-total"
                      step="0.01"
                      min="0"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      value={formData.totalAmount}
                      onChange={(e) => handleFieldChange('totalAmount', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  className="inline-flex items-center rounded-lg bg-indigo-600 px-8 py-3 text-white font-medium shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating GRN...
                    </>
                  ) : (
                    <>
                      <FilePlus2 className="mr-2 h-5 w-5" />
                      Create GRN
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Latest GRN Snapshot */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Latest GRN Snapshot</h2>
          <p className="text-sm text-indigo-100 dark:text-indigo-200 mt-1">Recently created record preview</p>
        </div>

        <div className="p-6">
          {createdRecord ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">GRN ID</p>
                    <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono">{createdRecord.grnId}</p>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-semibold">
                      {createdRecord.date && format(new Date(createdRecord.date), 'dd MMM yyyy')}
                    </div>
                  </div>
                </div>

                {/* Main Details Grid */}
                <div className="grid gap-4 md:grid-cols-2 mb-4">
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
                    <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-2">Supplier</p>
                    <p className="text-base font-bold text-gray-900 dark:text-white">{createdRecord.supplierName}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
                    <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-2">Transport</p>
                    <p className="text-base font-bold text-gray-900 dark:text-white">{createdRecord.transport}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
                    <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-2">Material</p>
                    <p className="text-base font-bold text-gray-900 dark:text-white">{createdRecord.rawMaterial}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800 shadow-sm">
                    <p className="text-xs uppercase tracking-wider text-green-700 dark:text-green-400 font-semibold mb-2">Total Amount</p>
                    <p className="text-xl font-bold text-green-700 dark:text-green-400">₹{(createdRecord.totalAmount || 0).toLocaleString()}</p>
                  </div>
                </div>

                {/* Quantity Details */}
                <div className="grid gap-4 md:grid-cols-3 mb-4">
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
                    <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-2">Billed Qty</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{createdRecord.billedQuantity}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
                    <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-2">Received Qty</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{createdRecord.receivedQuantity}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm">
                    <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-2">Tax %</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{createdRecord.taxPercentage}%</p>
                  </div>
                </div>

                {/* Tax Breakdown */}
                <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4 shadow-sm">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Tax Breakdown</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="flex justify-between items-center py-2 px-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <span className="text-xs uppercase tracking-wider text-blue-700 dark:text-blue-400 font-semibold">SGST</span>
                      <span className="text-sm font-bold text-blue-900 dark:text-blue-300">₹{(createdRecord.sgstAmount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 px-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <span className="text-xs uppercase tracking-wider text-purple-700 dark:text-purple-400 font-semibold">CGST</span>
                      <span className="text-sm font-bold text-purple-900 dark:text-purple-300">₹{(createdRecord.cgstAmount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 px-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <span className="text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400 font-semibold">IGST</span>
                      <span className="text-sm font-bold text-amber-900 dark:text-amber-300">₹{(createdRecord.igstAmount || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-12 text-center">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">No GRN Created Yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Create a GRN to see it summarized here.</p>
            </div>
          )}
        </div>
      </div>

      {/* All GRN Records - Main Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          type="button"
          onClick={() => setIsAllGrnsOpen(!isAllGrnsOpen)}
          className="w-full bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 flex items-center justify-between hover:from-slate-700 hover:to-slate-800 transition-all"
        >
          <div className="flex-1">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">All GRN Records</h2>
                <p className="text-sm text-slate-200 mt-1">Complete ledger of all goods receipt notes</p>
              </div>
              <div className="flex flex-wrap gap-3" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={handleFetchAllGrns}
                  className="inline-flex items-center rounded-lg bg-white dark:bg-gray-700 px-6 py-3 text-slate-900 dark:text-white font-medium shadow-lg hover:bg-slate-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-900 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={isLoadingAll}
                >
                  {isLoadingAll ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-5 w-5" />
                      Fetch All GRNs
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleExportToExcel}
                  disabled={allGrns.length === 0}
                  className="inline-flex items-center rounded-lg bg-indigo-600 px-6 py-3 text-white font-medium shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title={allGrns.length === 0 ? 'Fetch GRN records first to export' : 'Export to Excel'}
                >
                  <Download className="mr-2 h-5 w-5" />
                  Export Excel
                </button>
              </div>
            </div>
            {allGrns.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                  <span className="text-slate-300">Total Records:</span>
                  <span className="ml-2 font-bold text-white">{allGrns.length}</span>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                  <span className="text-slate-300">Total Value:</span>
                  <span className="ml-2 font-bold text-white">
                    ₹{allGrns.reduce((sum, r) => sum + (r.totalAmount || 0), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
          {isAllGrnsOpen ? (
            <ChevronUp className="h-6 w-6 text-white ml-4" />
          ) : (
            <ChevronDown className="h-6 w-6 text-white ml-4" />
          )}
        </button>

        {isAllGrnsOpen && (
          <div className="p-6">
            {allError && (
              <div className="mb-6 rounded-lg border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
                <strong>Error:</strong> {allError}
              </div>
            )}

            {deleteSuccess && (
              <div className="mb-6 rounded-lg border-l-4 border-green-500 bg-green-50 px-4 py-3 text-sm text-green-700">
                <strong>Success:</strong> {deleteSuccess}
              </div>
            )}

            {allGrns.length > 0 ? (
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">Serial no</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">Date</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">Supplier Name</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">Material</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">Bill Number</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">Bill Date</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">Billed Qty</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">Received Qty</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">Transport</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">Tally</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">SGST</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">CGST</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">IGST</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">Total</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {allGrns.map((record, index) => (
                      <tr key={record.grnId} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-colors">
                        <td className="whitespace-nowrap px-5 py-3 text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-100 dark:border-gray-700">{index + 1}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700">
                          {record.date ? format(new Date(record.date), 'dd MMM yyyy') : '—'}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700 font-medium">{record.supplierName}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700">{record.rawMaterial}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700 font-mono">{record.billNumber}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700">
                          {record.billDate ? format(new Date(record.billDate), 'dd MMM yyyy') : '—'}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700 text-center">{record.billedQuantity}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700 text-center">{record.receivedQuantity}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700">{record.transport}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700 font-mono text-xs">{record.tallyReference}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700">₹{(record.sgstAmount || 0).toLocaleString()}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700">₹{(record.cgstAmount || 0).toLocaleString()}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700">₹{(record.igstAmount || 0).toLocaleString()}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400 border-r border-gray-100 dark:border-gray-700">₹{(record.totalAmount || 0).toLocaleString()}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteGrn(record.grnId)}
                            disabled={deletingGrnId === record.grnId}
                            className="inline-flex items-center justify-center p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete GRN"
                          >
                            {deletingGrnId === record.grnId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              !isLoadingAll && (
                <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-12 text-center">
                  <Download className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                  <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">No GRN records loaded</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Click "Fetch All GRNs" to load the complete ledger</p>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div className="hidden bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setIsLookupByIdOpen(!isLookupByIdOpen)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-200"
        >
          <div className="text-left">
            <h2 className="text-xl font-semibold text-gray-900">Look up GRN by ID</h2>
            <p className="text-sm text-gray-500">Fetch exact record details from the backend.</p>
          </div>
          {isLookupByIdOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>
        {isLookupByIdOpen && (
          <div className="p-6 space-y-4">
            <form className="space-y-4" onSubmit={handleLookupGrn}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <input
                  type="text"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  placeholder="Enter GRN ID (e.g., 8afab499-...)"
                  value={grnLookupId}
                  onChange={(e) => setGrnLookupId(e.target.value)}
                  aria-label="Enter GRN ID"
                  required
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-60"
                  disabled={isLookingUp}
                >
                  {isLookingUp ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    'Fetch GRN'
                  )}
                </button>
              </div>
            </form>
            {lookupError && (
              <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                {lookupError}
              </div>
            )}
            {lookupResult && (
              <div className="rounded border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">GRN ID</p>
                    <p className="text-lg font-semibold text-gray-900">{lookupResult.grnId}</p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    {lookupResult.date && format(new Date(lookupResult.date), 'dd MMM yyyy')}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-gray-600 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Supplier</p>
                    <p className="font-medium text-gray-900">{lookupResult.supplierName}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Transport</p>
                    <p className="font-medium text-gray-900">{lookupResult.transport}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Material</p>
                    <p className="font-medium text-gray-900">{lookupResult.rawMaterial}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Total Amount</p>
                    <p className="font-medium text-gray-900">₹{(lookupResult.totalAmount || 0).toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-gray-600 md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Billed Qty</p>
                    <p className="font-medium text-gray-900">{lookupResult.billedQuantity}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Received Qty</p>
                    <p className="font-medium text-gray-900">{lookupResult.receivedQuantity}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Tax %</p>
                    <p className="font-medium text-gray-900">{lookupResult.taxPercentage}%</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-gray-600 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">SGST</p>
                    <p className="font-medium text-gray-900">₹{(lookupResult.sgstAmount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">CGST</p>
                    <p className="font-medium text-gray-900">₹{(lookupResult.cgstAmount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">IGST</p>
                    <p className="font-medium text-gray-900">₹{(lookupResult.igstAmount || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          type="button"
          onClick={() => setIsTransportSearchOpen(!isTransportSearchOpen)}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between hover:from-blue-700 hover:to-blue-800 transition-all"
        >
          <div className="text-left">
            <h2 className="text-xl font-bold text-white">View GRNs by Transport</h2>
            <p className="text-sm text-blue-100 mt-1">Search receipts by transport mode (Van, Truck, etc.)</p>
          </div>
          {isTransportSearchOpen ? (
            <ChevronUp className="h-6 w-6 text-white" />
          ) : (
            <ChevronDown className="h-6 w-6 text-white" />
          )}
        </button>
        {isTransportSearchOpen && (
          <div className="p-6 space-y-4">
            <form className="space-y-4" onSubmit={handleTransportSearch}>
              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Transport Type</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    placeholder="Enter transport type (e.g., Van, Truck)"
                    value={transportQuery}
                    onChange={(e) => setTransportQuery(e.target.value)}
                    aria-label="Enter transport type"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                  disabled={isLoadingTransport}
                >
                  {isLoadingTransport ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Search
                    </>
                  )}
                </button>
              </div>
            </form>
            {transportError && (
              <div className="rounded-lg border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
                <strong>Error:</strong> {transportError}
              </div>
            )}
            {transportResults.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Found {transportResults.length} record{transportResults.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {transportResults.map((record) => (
                  <div key={record.grnId} className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-600 p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">GRN ID</p>
                        <p className="text-base font-bold text-blue-600 dark:text-blue-400 font-mono">{record.grnId}</p>
                      </div>
                      <div className="inline-flex items-center px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold">
                        {record.date ? format(new Date(record.date), 'dd MMM yyyy') : '—'}
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-4 mb-3">
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">Supplier</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{record.supplierName}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">Material</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{record.rawMaterial}</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                        <p className="text-xs uppercase tracking-wider text-green-700 dark:text-green-400 font-semibold mb-1">Total Amount</p>
                        <p className="text-sm font-bold text-green-700 dark:text-green-400">₹{(record.totalAmount || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                        <p className="text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400 font-semibold mb-1">IGST</p>
                        <p className="text-sm font-bold text-amber-700 dark:text-amber-400">₹{(record.igstAmount || 0).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">Billed Qty</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{record.billedQuantity}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">Received Qty</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{record.receivedQuantity}</p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                        <p className="text-xs uppercase tracking-wider text-blue-700 dark:text-blue-400 font-semibold mb-1">Transport</p>
                        <p className="text-sm font-bold text-blue-900 dark:text-blue-300">{record.transport}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !isLoadingTransport &&
              transportQuery && (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-12 text-center">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">No GRNs Found</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No GRNs found for "{transportQuery}".</p>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          type="button"
          onClick={() => setIsSupplierSearchOpen(!isSupplierSearchOpen)}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex items-center justify-between hover:from-purple-700 hover:to-purple-800 transition-all"
        >
          <div className="text-left">
            <h2 className="text-xl font-bold text-white">View GRNs by Supplier</h2>
            <p className="text-sm text-purple-100 mt-1">Search all GRN records by supplier name</p>
          </div>
          {isSupplierSearchOpen ? (
            <ChevronUp className="h-6 w-6 text-white" />
          ) : (
            <ChevronDown className="h-6 w-6 text-white" />
          )}
        </button>
        {isSupplierSearchOpen && (
          <div className="p-6 space-y-4">
            <form className="space-y-4" onSubmit={handleSupplierSearch}>
              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Supplier Name</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    placeholder="Enter supplier name (e.g., ABC Suppliers Ltd)"
                    value={supplierQuery}
                    onChange={(e) => setSupplierQuery(e.target.value)}
                    aria-label="Enter supplier name"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg bg-purple-600 px-6 py-3 text-white font-semibold shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                  disabled={isLoadingSupplier}
                >
                  {isLoadingSupplier ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Search
                    </>
                  )}
                </button>
              </div>
            </form>
            {supplierError && (
              <div className="rounded-lg border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700">
                <strong>Error:</strong> {supplierError}
              </div>
            )}
            {supplierResults.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Found {supplierResults.length} record{supplierResults.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {supplierResults.map((record) => (
                  <div key={record.grnId} className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-600 p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">GRN ID</p>
                        <p className="text-base font-bold text-purple-600 dark:text-purple-400 font-mono">{record.grnId}</p>
                      </div>
                      <div className="inline-flex items-center px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-semibold">
                        {record.date ? format(new Date(record.date), 'dd MMM yyyy') : '—'}
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-4 mb-3">
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                        <p className="text-xs uppercase tracking-wider text-purple-700 dark:text-purple-400 font-semibold mb-1">Supplier</p>
                        <p className="text-sm font-bold text-purple-900 dark:text-purple-300">{record.supplierName}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">Transport</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{record.transport}</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                        <p className="text-xs uppercase tracking-wider text-green-700 dark:text-green-400 font-semibold mb-1">Total Amount</p>
                        <p className="text-sm font-bold text-green-700 dark:text-green-400">₹{(record.totalAmount || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                        <p className="text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400 font-semibold mb-1">IGST</p>
                        <p className="text-sm font-bold text-amber-700 dark:text-amber-400">₹{(record.igstAmount || 0).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">Material</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{record.rawMaterial}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">Billed Qty</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{record.billedQuantity}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-1">Received Qty</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{record.receivedQuantity}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !isLoadingSupplier &&
              supplierQuery && (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-12 text-center">
                  <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">No GRNs Found</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No GRNs found for supplier "{supplierQuery}".</p>
                </div>
              )
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default GRN;
