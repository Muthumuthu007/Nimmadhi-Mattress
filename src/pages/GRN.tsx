import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { FilePlus2, Download, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { createGrn, CreateGrnResponse, getGrnById, GrnRecord, getGrnByTransport, getGrnBySupplier } from '../utils/grnApi';
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
  const navigate = useNavigate();
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

  // Dropdown open/close states
  const [isCreateGrnOpen, setIsCreateGrnOpen] = useState(false);
  const [isLookupByIdOpen, setIsLookupByIdOpen] = useState(false);
  const [isTransportSearchOpen, setIsTransportSearchOpen] = useState(false);
  const [isSupplierSearchOpen, setIsSupplierSearchOpen] = useState(false);

  // Sort state for transport results
  const [transportSortField, setTransportSortField] = useState('date');
  const [transportSortDir, setTransportSortDir] = useState<'asc' | 'desc'>('desc');

  // Sort state for supplier results
  const [supplierSortField, setSupplierSortField] = useState('date');
  const [supplierSortDir, setSupplierSortDir] = useState<'asc' | 'desc'>('desc');

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

      {/* Navigation Cards for GRN Reports */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          type="button"
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-left group border border-gray-200 dark:border-gray-700"
          onClick={() => navigate('/dashboard/grn/daily')}
        >
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/60 transition-colors">
              <svg className="h-8 w-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Daily GRN</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">View daily goods receipt records</p>
            </div>
          </div>
        </button>

        <button
          type="button"
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-left group border border-gray-200 dark:border-gray-700"
          onClick={() => navigate('/dashboard/grn/weekly')}
        >
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/40 rounded-xl group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/60 transition-colors">
              <svg className="h-8 w-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Weekly GRN</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Analyze weekly goods receipt summary</p>
            </div>
          </div>
        </button>

        <button
          type="button"
          className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-left group border border-gray-200 dark:border-gray-700"
          onClick={() => navigate('/dashboard/grn/monthly')}
        >
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/40 rounded-xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/60 transition-colors">
              <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Monthly GRN</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Track monthly goods receipt trends</p>
            </div>
          </div>
        </button>
      </div>

      {/* View GRNs by Transport */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          type="button"
          onClick={() => setIsTransportSearchOpen(!isTransportSearchOpen)}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between hover:from-blue-700 hover:to-blue-800 transition-all"
        >
          <div className="text-left">
            <h2 className="text-xl font-bold text-white">View GRNs by Transport</h2>
            <p className="text-sm text-blue-100 mt-1">Search all GRN records by transport name</p>
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
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Transport Name</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    placeholder="Enter transport name (e.g., MSS, OWN)"
                    value={transportQuery}
                    onChange={(e) => setTransportQuery(e.target.value)}
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
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-semibold">{transportResults.length} records found</span>
                  <span className="text-gray-400">·</span>
                  <span>Click column headers to sort</span>
                </div>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {[
                        { label: 'Date', field: 'date' },
                        { label: 'Supplier', field: 'supplierName' },
                        { label: 'Material', field: 'rawMaterial' },
                        { label: 'Bill No.', field: 'billNumber' },
                        { label: 'Rec. Qty', field: 'receivedQuantity' },
                        { label: 'Total', field: 'totalAmount' },
                      ].map(({ label, field }) => (
                        <th
                          key={field}
                          className="px-5 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          onClick={() => {
                            if (transportSortField === field) {
                              setTransportSortDir(transportSortDir === 'asc' ? 'desc' : 'asc');
                            } else {
                              setTransportSortField(field);
                              setTransportSortDir('asc');
                            }
                          }}
                        >
                          <div className="flex items-center gap-1">
                            {label}
                            {transportSortField === field ? (
                              <span className="text-blue-500">{transportSortDir === 'asc' ? '↑' : '↓'}</span>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-500">↕</span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {[...transportResults]
                      .sort((a: any, b: any) => {
                        let aVal = a[transportSortField];
                        let bVal = b[transportSortField];
                        if (transportSortField === 'date') {
                          aVal = new Date(aVal).getTime();
                          bVal = new Date(bVal).getTime();
                        } else if (typeof aVal === 'string') {
                          aVal = aVal.toLowerCase();
                          bVal = (bVal || '').toLowerCase();
                        }
                        if (aVal < bVal) return transportSortDir === 'asc' ? -1 : 1;
                        if (aVal > bVal) return transportSortDir === 'asc' ? 1 : -1;
                        return 0;
                      })
                      .map((record) => (
                        <tr key={record.grnId} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-colors">
                          <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700 dark:text-gray-300">
                            {record.date ? format(new Date(record.date), 'dd MMM yyyy') : '—'}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-sm font-medium text-gray-900 dark:text-white">{record.supplierName}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700 dark:text-gray-300">{record.rawMaterial}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700 dark:text-gray-300 font-mono">{record.billNumber}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700 dark:text-gray-300">{record.receivedQuantity}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-sm font-semibold text-blue-600 dark:text-blue-400">₹{(record.totalAmount || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              !isLoadingTransport && transportQuery && (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-12 text-center">
                  <p className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">No GRNs Found</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No GRNs found for transport "{transportQuery}".</p>
                </div>
              )
            )}

          </div>
        )}
      </div>

      {/* View GRNs by Supplier */}
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
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-semibold">{supplierResults.length} records found</span>
                  <span className="text-gray-400">·</span>
                  <span>Click column headers to sort</span>
                </div>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {[
                        { label: 'Date', field: 'date' },
                        { label: 'Supplier', field: 'supplierName' },
                        { label: 'Material', field: 'rawMaterial' },
                        { label: 'Bill No.', field: 'billNumber' },
                        { label: 'Transport', field: 'transport' },
                        { label: 'Rec. Qty', field: 'receivedQuantity' },
                        { label: 'Total', field: 'totalAmount' },
                      ].map(({ label, field }) => (
                        <th
                          key={field}
                          className="px-5 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          onClick={() => {
                            if (supplierSortField === field) {
                              setSupplierSortDir(supplierSortDir === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSupplierSortField(field);
                              setSupplierSortDir('asc');
                            }
                          }}
                        >
                          <div className="flex items-center gap-1">
                            {label}
                            {supplierSortField === field ? (
                              <span className="text-purple-500">{supplierSortDir === 'asc' ? '↑' : '↓'}</span>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-500">↕</span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {[...supplierResults]
                      .sort((a: any, b: any) => {
                        let aVal = a[supplierSortField];
                        let bVal = b[supplierSortField];
                        if (supplierSortField === 'date') {
                          aVal = new Date(aVal).getTime();
                          bVal = new Date(bVal).getTime();
                        } else if (typeof aVal === 'string') {
                          aVal = aVal.toLowerCase();
                          bVal = (bVal || '').toLowerCase();
                        }
                        if (aVal < bVal) return supplierSortDir === 'asc' ? -1 : 1;
                        if (aVal > bVal) return supplierSortDir === 'asc' ? 1 : -1;
                        return 0;
                      })
                      .map((record) => (
                        <tr key={record.grnId} className="hover:bg-purple-50/30 dark:hover:bg-purple-900/20 transition-colors">
                          <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700 dark:text-gray-300">
                            {record.date ? format(new Date(record.date), 'dd MMM yyyy') : '—'}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-sm font-medium text-gray-900 dark:text-white">{record.supplierName}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700 dark:text-gray-300">{record.rawMaterial}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700 dark:text-gray-300 font-mono">{record.billNumber}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700 dark:text-gray-300">{record.transport}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-sm text-gray-700 dark:text-gray-300">{record.receivedQuantity}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-sm font-semibold text-purple-600 dark:text-purple-400">₹{(record.totalAmount || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              !isLoadingSupplier && supplierQuery && (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-12 text-center">
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
