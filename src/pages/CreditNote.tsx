import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileMinus2, RefreshCcw, Undo2 } from 'lucide-react';
import { handleApiError } from '../utils/api';
import { CreditNoteMaterialPreview, CreditNoteReversalResponse, CreditNoteSummary, productionApi, ProductionProduct } from '../utils/productionApi';

const newCreditNoteKey = () => `credit-note-${crypto.randomUUID()}`;
const newCreditNoteUndoKey = () => `undo-credit-note-${crypto.randomUUID()}`;

export default function CreditNote() {
  const [products, setProducts] = useState<ProductionProduct[]>([]);
  const [productId, setProductId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CreditNoteReversalResponse | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [activeNotes, setActiveNotes] = useState<CreditNoteSummary[]>([]);
  const [materialPreview, setMaterialPreview] = useState<CreditNoteMaterialPreview | null>(null);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [excludedMaterialIds, setExcludedMaterialIds] = useState<string[]>([]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.product_id === productId),
    [products, productId],
  );

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await productionApi.list();
      setProducts(response.data?.all_products || []);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const loadCreditNotes = async () => {
    try {
      const response = await productionApi.listCreditNoteReversals();
      setActiveNotes(response.data?.credit_notes || []);
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  useEffect(() => { loadProducts(); loadCreditNotes(); }, []);

  useEffect(() => {
    if (!productId) {
      setMaterialPreview(null);
      setExcludedMaterialIds([]);
      return;
    }
    let active = true;
    setLoadingMaterials(true);
    setError('');
    setResult(null);
    setExcludedMaterialIds([]);
    productionApi.creditNoteMaterials(productId)
      .then((response) => { if (active) setMaterialPreview(response.data); })
      .catch((err) => { if (active) { setMaterialPreview(null); setError(handleApiError(err)); } })
      .finally(() => { if (active) setLoadingMaterials(false); });
    return () => { active = false; };
  }, [productId]);

  const toggleExcludedMaterial = (materialId: string) => {
    setExcludedMaterialIds((current) => current.includes(materialId)
      ? current.filter((id) => id !== materialId)
      : [...current, materialId]);
  };

  const confirmReversal = async () => {
    if (!selectedProduct) {
      setError('Choose the finished product to reverse.');
      return;
    }
    const selectedMaterialCount = (materialPreview?.raw_materials.length || 0) - excludedMaterialIds.length;
    if (!materialPreview || selectedMaterialCount < 1) {
      setError('Keep at least one raw material to return to stock.');
      return;
    }
    if (!window.confirm(`Confirm credit note for 1 unit of ${selectedProduct.product_name}? ${selectedMaterialCount} raw material(s) will be returned to stock. Materials marked as damaged will not be returned.`)) return;

    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const response = await productionApi.creditNoteReversal(selectedProduct.product_id, excludedMaterialIds, newCreditNoteKey());
      setResult(response.data);
      await Promise.all([loadProducts(), loadCreditNotes()]);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const undoReversal = async (note: Pick<CreditNoteSummary, 'credit_note_id' | 'product_name'>) => {
    if (!window.confirm(`Undo credit note for ${note.product_name}? This will remove the raw materials that this credit note restored.`)) return;
    setUndoing(true);
    setError('');
    try {
      await productionApi.undoCreditNoteReversal(note.credit_note_id, newCreditNoteUndoKey());
      setResult(null);
      await Promise.all([loadProducts(), loadCreditNotes()]);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setUndoing(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-2xl bg-gradient-to-r from-rose-700 to-orange-600 p-6 text-white shadow-lg">
        <div className="flex items-start gap-4">
          <FileMinus2 className="h-10 w-10 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold">Credit Note</h1>
            <p className="mt-1 text-rose-100">Reverse one finished unit and return its configured raw materials to inventory.</p>
          </div>
        </div>
      </section>

      {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</div>}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Reverse a finished product</h2><p className="mt-1 text-sm text-gray-500">Review its raw materials first. Keep materials that can be returned; mark damaged materials so they are excluded.</p></div>
          <button onClick={loadProducts} disabled={loading || submitting} className="inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"><RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Finished product
            <select value={productId} onChange={(event) => setProductId(event.target.value)} disabled={loading || submitting} className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2.5 text-gray-900 dark:border-gray-600 dark:text-white">
              <option value="">{loading ? 'Loading products…' : 'Choose a product'}</option>
              {products.map((product) => <option key={product.product_id} value={product.product_id}>{product.product_name}</option>)}
            </select>
          </label>
          <button onClick={confirmReversal} disabled={!selectedProduct || !materialPreview || loading || loadingMaterials || submitting} className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"><FileMinus2 className="h-4 w-4" />{submitting ? 'Reversing…' : 'Confirm reversal'}</button>
        </div>

        {selectedProduct && (
          <div className="mt-5 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700"><h3 className="font-semibold text-gray-900 dark:text-white">Raw materials to return</h3><p className="mt-1 text-sm text-gray-500">Untick a damaged material (for example, a broken spring) to exclude it from the stock return.</p></div>
            {loadingMaterials ? <p className="px-4 py-5 text-sm text-gray-500">Loading raw materials…</p> : materialPreview?.raw_materials.length ? <ul className="divide-y divide-gray-200 dark:divide-gray-700">{materialPreview.raw_materials.map((material) => {
              const excluded = excludedMaterialIds.includes(material.material_id);
              return <li key={material.material_id} className="flex items-center justify-between gap-4 px-4 py-3">
                <label className="flex min-w-0 cursor-pointer items-center gap-3"><input type="checkbox" checked={!excluded} onChange={() => toggleExcludedMaterial(material.material_id)} disabled={submitting} className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500" /><span className={excluded ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}><span className="block font-medium">{material.material_name}</span><span className="block text-xs text-gray-500">Return: +{material.quantity_to_restore} {material.exists_in_inventory ? `· Current stock: ${material.current_stock}` : '· Not found in current inventory'}</span></span></label><span className={excluded ? 'shrink-0 text-xs font-semibold text-rose-600 dark:text-rose-300' : 'shrink-0 text-xs font-semibold text-emerald-600 dark:text-emerald-300'}>{excluded ? 'Damaged — do not return' : 'Will return'}</span>
              </li>;
            })}</ul> : <p className="px-4 py-5 text-sm text-gray-500">No raw materials are configured for this product.</p>}
          </div>
        )}

        <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"><AlertTriangle className="h-5 w-5 shrink-0" /><p>Only checked materials are added back to stock. Each confirmed credit note can be undone from the Active credit notes section below, provided those returned materials have not been used.</p></div>
      </section>

      {result && <section role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30"><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" /><div><h2 className="font-semibold text-emerald-900 dark:text-emerald-100">Credit note confirmed — {result.product_name}</h2><p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">One unit was reversed and the following raw materials were returned to stock.</p></div></div><button onClick={() => undoReversal(result)} disabled={undoing} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:bg-gray-900 dark:text-rose-300"><Undo2 className="h-4 w-4" />{undoing ? 'Undoing…' : 'Undo credit note'}</button></div><ul className="mt-5 divide-y divide-emerald-200 rounded-xl border border-emerald-200 bg-white/70 dark:divide-emerald-900 dark:border-emerald-900 dark:bg-gray-900/30">{result.raw_materials_restored.map((material) => <li key={material.material_id} className="flex justify-between gap-4 px-4 py-3 text-sm"><span className="font-medium text-gray-900 dark:text-white">{material.material_name}</span><span className="text-emerald-700 dark:text-emerald-300">+{material.quantity_restored}</span></li>)}</ul>{result.raw_materials_excluded?.length ? <p className="mt-4 text-sm text-rose-700 dark:text-rose-300">Not returned because marked damaged: {result.raw_materials_excluded.map((material) => material.material_name).join(', ')}.</p> : null}</section>}

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700"><div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Active credit notes</h2><p className="mt-1 text-sm text-gray-500">Undo any completed credit note from this list.</p></div><button onClick={loadCreditNotes} disabled={undoing} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700">Refresh list</button></div>{activeNotes.length === 0 ? <p className="px-6 py-8 text-sm text-gray-500">No active credit notes.</p> : <ul className="divide-y divide-gray-200 dark:divide-gray-700">{activeNotes.map((note) => <li key={note.credit_note_id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-gray-900 dark:text-white">{note.product_name}</p><p className="mt-1 text-xs text-gray-500">Credit note: {note.credit_note_id} · {note.reversed_at ? new Date(note.reversed_at).toLocaleString() : 'Date unavailable'}</p></div><button onClick={() => undoReversal(note)} disabled={undoing} className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:text-rose-300"><Undo2 className="h-4 w-4" />{undoing ? 'Undoing…' : 'Undo'}</button></li>)}</ul>}</section>
    </main>
  );
}
