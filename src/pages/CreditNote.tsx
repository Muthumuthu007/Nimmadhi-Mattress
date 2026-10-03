import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileMinus2, RefreshCcw, Undo2 } from 'lucide-react';
import { handleApiError } from '../utils/api';
import { CreditNoteReversalResponse, productionApi, ProductionProduct } from '../utils/productionApi';

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

  useEffect(() => { loadProducts(); }, []);

  const confirmReversal = async () => {
    if (!selectedProduct) {
      setError('Choose the finished product to reverse.');
      return;
    }
    if (!window.confirm(`Confirm credit note for 1 unit of ${selectedProduct.product_name}? Its configured raw materials will be returned to stock.`)) return;

    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const response = await productionApi.creditNoteReversal(selectedProduct.product_id, newCreditNoteKey());
      setResult(response.data);
      await loadProducts();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const undoReversal = async () => {
    if (!result) return;
    if (!window.confirm(`Undo credit note for ${result.product_name}? This will remove the raw materials that this credit note restored.`)) return;
    setUndoing(true);
    setError('');
    try {
      await productionApi.undoCreditNoteReversal(result.credit_note_id, newCreditNoteUndoKey());
      setResult(null);
      await loadProducts();
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
          <div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Reverse a finished product</h2><p className="mt-1 text-sm text-gray-500">Each confirmation reverses exactly one unit using the product’s current raw-material configuration.</p></div>
          <button onClick={loadProducts} disabled={loading || submitting} className="inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"><RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Finished product
            <select value={productId} onChange={(event) => { setProductId(event.target.value); setResult(null); }} disabled={loading || submitting} className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2.5 text-gray-900 dark:border-gray-600 dark:text-white">
              <option value="">{loading ? 'Loading products…' : 'Choose a product'}</option>
              {products.map((product) => <option key={product.product_id} value={product.product_id}>{product.product_name}</option>)}
            </select>
          </label>
          <button onClick={confirmReversal} disabled={!selectedProduct || loading || submitting} className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"><FileMinus2 className="h-4 w-4" />{submitting ? 'Reversing…' : 'Confirm reversal'}</button>
        </div>

        <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"><AlertTriangle className="h-5 w-5 shrink-0" /><p>This action adds raw materials back to stock. It does not require a previous production push and cannot be undone from this page.</p></div>
      </section>

      {result && <section role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30"><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" /><div><h2 className="font-semibold text-emerald-900 dark:text-emerald-100">Credit note confirmed — {result.product_name}</h2><p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">One unit was reversed and the following raw materials were returned to stock.</p></div></div><button onClick={undoReversal} disabled={undoing} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:bg-gray-900 dark:text-rose-300"><Undo2 className="h-4 w-4" />{undoing ? 'Undoing…' : 'Undo credit note'}</button></div><ul className="mt-5 divide-y divide-emerald-200 rounded-xl border border-emerald-200 bg-white/70 dark:divide-emerald-900 dark:border-emerald-900 dark:bg-gray-900/30">{result.raw_materials_restored.map((material) => <li key={material.material_id} className="flex justify-between gap-4 px-4 py-3 text-sm"><span className="font-medium text-gray-900 dark:text-white">{material.material_name}</span><span className="text-emerald-700 dark:text-emerald-300">+{material.quantity_restored}</span></li>)}</ul></section>}
    </main>
  );
}
