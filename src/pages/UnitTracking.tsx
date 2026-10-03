import { useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Clipboard, PackageCheck, QrCode, Search, Truck } from 'lucide-react';
import { productionApi, ProductionProduct } from '../utils/productionApi';
import { handleApiError } from '../utils/api';
import { newIdempotencyKey, UnitGenerationResponse, unitApi } from '../utils/unitApi';

const statusClass: Record<string, string> = {
  READY_FOR_DISPATCH: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  IN_TRANSIT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  RECEIVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
};

const labelForStatus = (status?: string) => status?.replaceAll('_', ' ') || '-';

interface UnitTrackingRecord {
  product_id?: string;
  product_name?: string;
  unit_sequence?: number;
  movement_status?: string;
  destination_id?: string;
}

interface UnitMovement {
  movement_id?: string;
  event_type?: string;
  movement_status_after?: string;
  timestamp?: string;
  from_location?: string;
  to_location?: string;
}

export default function UnitTracking() {
  const [products, setProducts] = useState<ProductionProduct[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [productId, setProductId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [generated, setGenerated] = useState<UnitGenerationResponse | null>(null);
  const [unitId, setUnitId] = useState('');
  const [tracking, setTracking] = useState<UnitTrackingRecord | null>(null);
  const [movements, setMovements] = useState<UnitMovement[]>([]);
  const [loading, setLoading] = useState<'products' | 'generate' | 'dispatch' | 'track' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const generateKey = useRef<{ fingerprint: string; key: string } | null>(null);
  const dispatchKeys = useRef(new Map<string, string>());

  const selectedProduct = useMemo(
    () => products.find((product) => product.product_id === productId),
    [products, productId],
  );

  const loadProducts = async () => {
    setLoading('products'); setError('');
    try {
      const response = await productionApi.list();
      const list = response.data?.all_products || [];
      setProducts(list);
      setProductsLoaded(true);
    } catch (err) {
      setError(handleApiError(err));
    } finally { setLoading(null); }
  };

  const generate = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setNotice('');
    const normalizedDestination = destinationId.trim();
    if (!productId || !normalizedDestination || !Number.isInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > 49) {
      setError('Choose a product and destination, then enter a whole quantity from 1 to 49.');
      return;
    }
    const fingerprint = `${productId}|${quantity}|${normalizedDestination}`;
    if (!generateKey.current || generateKey.current.fingerprint !== fingerprint) {
      generateKey.current = { fingerprint, key: newIdempotencyKey('generate-units') };
    }
    setLoading('generate');
    try {
      const response = await unitApi.generate(productId, Number(quantity), normalizedDestination, generateKey.current.key);
      setGenerated(response.data);
      setNotice(`${response.data.quantity} QR unit label(s) generated for ${response.data.destination_id}.`);
    } catch (err) { setError(handleApiError(err)); }
    finally { setLoading(null); }
  };

  const refreshTracking = async (value = unitId.trim()) => {
    if (!value) { setError('Enter or scan a unit ID first.'); return; }
    setLoading('track'); setError(''); setNotice('');
    try {
      const [trackingResponse, movementResponse] = await Promise.all([unitApi.tracking(value), unitApi.movements(value)]);
      setTracking(trackingResponse.data as UnitTrackingRecord);
      setMovements((movementResponse.data?.movements || []) as UnitMovement[]);
    } catch (err) { setError(handleApiError(err)); }
    finally { setLoading(null); }
  };

  const dispatch = async () => {
    const value = unitId.trim();
    if (!value) { setError('Enter or scan a READY FOR DISPATCH unit ID first.'); return; }
    setLoading('dispatch'); setError(''); setNotice('');
    const key = dispatchKeys.current.get(value) || newIdempotencyKey('dispatch-unit');
    dispatchKeys.current.set(value, key);
    try {
      const response = await unitApi.dispatch(value, key);
      setNotice(`Unit ${response.data.unit_id} is now in transit to ${response.data.destination_id}.`);
      await refreshTracking(value);
    } catch (err) { setError(handleApiError(err)); }
    finally { setLoading(null); }
  };

  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setNotice('Copied to clipboard.'); }
    catch { setError('Could not copy automatically. Select and copy the unit ID manually.'); }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-indigo-700 to-violet-700 p-6 text-white shadow-lg">
        <div className="flex gap-4 items-start"><QrCode className="w-9 h-9 shrink-0" /><div><h1 className="text-2xl font-bold">QR unit movement</h1><p className="mt-1 text-indigo-100">Generate one physical label per product unit, dispatch it from the factory, then track its receipt at the destination outlet.</p></div></div>
      </section>
      {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">{notice}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-lg text-gray-900 dark:text-white">1. Create QR unit labels</h2><button onClick={loadProducts} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700" disabled={loading === 'products'}>{productsLoaded ? 'Refresh products' : 'Load products'}</button></div>
          <form onSubmit={generate} className="mt-5 space-y-4">
            <label className="block text-sm font-medium">Product<select required value={productId} onChange={(e) => setProductId(e.target.value)} disabled={!productsLoaded} className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2"><option value="">{productsLoaded ? 'Choose a product' : 'Load products first'}</option>{products.map((product) => <option key={product.product_id} value={product.product_id}>{product.product_name} {product.max_produce != null ? `— max produce ${product.max_produce}` : ''}</option>)}</select></label>
            {selectedProduct && <p className="text-sm text-gray-500">Selected product: <strong>{selectedProduct.product_name}</strong></p>}
            <label className="block text-sm font-medium">Destination outlet ID<input required value={destinationId} onChange={(e) => setDestinationId(e.target.value)} placeholder="e.g. OUT001 or NIM001" className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2" /></label>
            <label className="block text-sm font-medium">Number of physical units (1–49)<input required type="number" min="1" max="49" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2" /></label>
            <button disabled={!productsLoaded || loading === 'generate'} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50"><PackageCheck className="w-4 h-4" />{loading === 'generate' ? 'Generating…' : 'Generate QR labels'}</button>
          </form>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="font-semibold text-lg text-gray-900 dark:text-white">2. Scan to dispatch and track</h2>
          <p className="mt-1 text-sm text-gray-500">Use a USB/phone scanner or paste the unit ID from its QR label.</p>
          <label className="mt-5 block text-sm font-medium">Unit ID<input value={unitId} onChange={(e) => setUnitId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && refreshTracking()} placeholder="Scan or enter unit ID" className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2" /></label>
          <div className="mt-4 flex flex-wrap gap-3"><button onClick={() => refreshTracking()} disabled={loading !== null} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700"><Search className="w-4 h-4" />Track unit</button><button onClick={dispatch} disabled={loading !== null} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-gray-950 disabled:opacity-50"><Truck className="w-4 h-4" />Dispatch unit</button></div>
          {tracking && <div className="mt-5 rounded-xl border border-gray-200 p-4 dark:border-gray-700 space-y-2"><div className="flex flex-wrap justify-between gap-2"><strong>{tracking.product_name || tracking.product_id}</strong><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass[tracking.movement_status] || 'bg-gray-100 text-gray-700'}`}>{labelForStatus(tracking.movement_status)}</span></div><div className="grid grid-cols-2 gap-3 text-sm"><p><span className="text-gray-500">Destination</span><br />{tracking.destination_id || '-'}</p><p><span className="text-gray-500">Unit sequence</span><br />{tracking.unit_sequence ?? '-'}</p></div></div>}
        </section>
      </div>

      {generated && <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-lg text-gray-900 dark:text-white">Generated labels</h2><p className="text-sm text-gray-500">Batch {generated.batch_id} · destination {generated.destination_id}</p></div><button onClick={() => window.print()} className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">Print labels</button></div><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{generated.units.map((unit) => <article key={unit.unit_id} className="rounded-xl border p-4 text-center dark:border-gray-700"><QRCodeSVG value={JSON.stringify({ unit_id: unit.unit_id })} size={148} includeMargin /><p className="mt-3 break-all font-mono text-xs">{unit.unit_id}</p><p className="mt-1 text-sm font-medium">{generated.product_name}</p><button onClick={() => { setUnitId(unit.unit_id); copy(unit.unit_id); }} className="mt-3 inline-flex items-center gap-1 text-sm text-indigo-600"><Clipboard className="w-4 h-4" />Copy unit ID</button></article>)}</div></section>}

      {tracking && <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"><h2 className="font-semibold text-lg text-gray-900 dark:text-white">Movement history</h2>{movements.length ? <ol className="mt-4 space-y-3">{movements.map((movement, index) => <li key={movement.movement_id || index} className="flex gap-3 border-l-2 border-indigo-300 pl-4 text-sm"><CheckCircle2 className="w-4 h-4 mt-0.5 text-indigo-600 shrink-0" /><div><strong>{movement.event_type || movement.movement_status_after}</strong><span className="ml-2 text-gray-500">{movement.timestamp ? new Date(movement.timestamp).toLocaleString() : ''}</span><p className="text-gray-500">{movement.from_location || '-'} → {movement.to_location || '-'}</p></div></li>)}</ol> : <p className="mt-4 text-sm text-gray-500">No movement events have been recorded for this unit yet.</p>}</section>}
    </main>
  );
}
