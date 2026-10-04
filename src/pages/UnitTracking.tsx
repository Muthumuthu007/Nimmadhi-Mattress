import { useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QRCodeSVG } from 'qrcode.react';
import { Camera, CheckCircle2, Clipboard, PackageCheck, QrCode, Search, X } from 'lucide-react';
import { productionApi, ProductionProduct } from '../utils/productionApi';
import { handleApiError } from '../utils/api';
import { newIdempotencyKey, UnitGenerationResponse, unitApi } from '../utils/unitApi';

const statusClass: Record<string, string> = {
  READY_FOR_DISPATCH: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  IN_TRANSIT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  RECEIVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
};

const labelForStatus = (status?: string) => status?.replaceAll('_', ' ') || '-';

const unitIdFromScan = (value: string) => {
  const scanned = value.trim();
  if (!scanned) return '';
  try {
    const payload = JSON.parse(scanned);
    return typeof payload?.unit_id === 'string' && payload.unit_id.trim()
      ? payload.unit_id.trim()
      : scanned;
  } catch {
    return scanned;
  }
};

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
  const [quantity, setQuantity] = useState(1);
  const [generated, setGenerated] = useState<UnitGenerationResponse | null>(null);
  const [unitId, setUnitId] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [tracking, setTracking] = useState<UnitTrackingRecord | null>(null);
  const [movements, setMovements] = useState<UnitMovement[]>([]);
  const [loading, setLoading] = useState<'products' | 'generate' | 'track' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const generateKey = useRef<{ fingerprint: string; key: string } | null>(null);
  const labelRefs = useRef(new Map<string, HTMLElement>());
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const selectedProduct = useMemo(
    () => products.find((product) => product.product_id === productId),
    [products, productId],
  );

  const stopCamera = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner?.isScanning) {
      try { await scanner.stop(); } catch { /* The browser may have already stopped the stream. */ }
    }
    scanner?.clear?.();
    setCameraOpen(false);
  };

  useEffect(() => {
    if (!cameraOpen) return undefined;
    let cancelled = false;
    const startCamera = async () => {
      try {
        const scanner = new Html5Qrcode('inventory-qr-dispatch-camera');
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          async (decodedText) => {
            if (cancelled) return;
            setUnitId(unitIdFromScan(decodedText));
            setCameraError('');
            await stopCamera();
          },
          () => {},
        );
      } catch (cameraFailure) {
        if (!cancelled) {
          setCameraError(cameraFailure instanceof Error ? cameraFailure.message : 'Unable to open the camera. Allow camera access and try again.');
          setCameraOpen(false);
        }
      }
    };
    startCamera();
    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner?.isScanning) scanner.stop().catch(() => {});
    };
  }, [cameraOpen]);

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
    if (!productId || !Number.isInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > 49) {
      setError('Choose a product and enter a whole quantity from 1 to 49.');
      return;
    }
    const fingerprint = `${productId}|${quantity}`;
    if (!generateKey.current || generateKey.current.fingerprint !== fingerprint) {
      generateKey.current = { fingerprint, key: newIdempotencyKey('generate-units') };
    }
    setLoading('generate');
    try {
      const response = await unitApi.generate(productId, Number(quantity), generateKey.current.key);
      setGenerated(response.data);
      setNotice(`${response.data.quantity} QR unit label(s) generated and ready to print.`);
    } catch (err) { setError(handleApiError(err)); }
    finally { setLoading(null); }
  };

  const refreshTracking = async (value = unitId.trim()) => {
    value = unitIdFromScan(value);
    if (!value) { setError('Enter or scan a unit ID first.'); return; }
    setLoading('track'); setError(''); setNotice('');
    try {
      const [trackingResponse, movementResponse] = await Promise.all([unitApi.tracking(value), unitApi.movements(value)]);
      setTracking(trackingResponse.data as UnitTrackingRecord);
      setMovements((movementResponse.data?.movements || []) as UnitMovement[]);
    } catch (err) { setError(handleApiError(err)); }
    finally { setLoading(null); }
  };

  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setNotice('Copied to clipboard.'); }
    catch { setError('Could not copy automatically. Select and copy the unit ID manually.'); }
  };

  const printLabel = (id: string) => {
    const label = labelRefs.current.get(id);
    if (!label) {
      setError('That QR label is not ready to print. Please generate it again.');
      return;
    }

    // Use a dedicated print document so the browser prints one label only,
    // rather than the full dashboard or the whole generated batch.
    // Safari can open a blank tab when `noopener`/`noreferrer` is supplied to
    // window.open and the caller subsequently writes the print document.
    // Open a same-origin document first, write it synchronously from the click
    // handler, then remove the opener after its contents are ready.
    const printWindow = window.open('', '_blank', 'width=420,height=520');
    if (!printWindow) {
      setError('Your browser blocked the print window. Allow pop-ups for this site and try again.');
      return;
    }
    printWindow.document.open();
    // The label printer receives only the code, on a square 50 mm sticker.
    // Do not include product text or an ID: the QR payload itself contains the
    // immutable unit ID and remains readable after the sticker is attached.
    const qrMarkup = label.querySelector('svg')?.outerHTML;
    if (!qrMarkup) {
      printWindow.close();
      setError('The QR image is not ready to print. Please generate the label again.');
      return;
    }
    printWindow.document.write(`<!doctype html><html><head><title>QR sticker</title><style>
      @page { size: 50mm 50mm; margin: 0; }
      html, body { width: 50mm; height: 50mm; margin: 0; padding: 0; overflow: hidden; background: #ffffff; }
      .qr-sticker { width: 50mm; height: 50mm; display: flex; align-items: center; justify-content: center; }
      svg { display: block; width: 46mm; height: 46mm; }
    </style></head><body><div class="qr-sticker">${qrMarkup}</div><script>window.addEventListener('load', () => { setTimeout(() => { window.focus(); window.print(); }, 100); }); window.addEventListener('afterprint', () => window.close());</script></body></html>`);
    printWindow.document.close();
    printWindow.opener = null;
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-indigo-700 to-violet-700 p-6 text-white shadow-lg">
        <div className="flex gap-4 items-start"><QrCode className="w-9 h-9 shrink-0" /><div><h1 className="text-2xl font-bold">QR unit management</h1><p className="mt-1 text-indigo-100">Generate and print factory QR labels here. Factory dispatch is confirmed from Sales Admin → Load Plans; outlet receipt is recorded when the employee scans the label.</p></div></div>
      </section>
      {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">{notice}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-lg text-gray-900 dark:text-white">1. Create QR unit labels</h2><button onClick={loadProducts} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-500 dark:text-gray-100 dark:hover:bg-gray-700" disabled={loading === 'products'}>{productsLoaded ? 'Refresh products' : 'Load products'}</button></div>
          <form onSubmit={generate} className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Product<select required value={productId} onChange={(e) => setProductId(e.target.value)} disabled={!productsLoaded} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-500 dark:bg-gray-900 dark:text-white"><option value="">{productsLoaded ? 'Choose a product' : 'Load products first'}</option>{products.map((product) => <option key={product.product_id} value={product.product_id}>{product.product_name} {product.max_produce != null ? `— max produce ${product.max_produce}` : ''}</option>)}</select></label>
            {selectedProduct && <p className="text-sm text-gray-600 dark:text-gray-300">Selected product: <strong>{selectedProduct.product_name}</strong></p>}
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Number of physical units (1–49)<input required type="number" min="1" max="49" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-500 dark:bg-gray-900 dark:text-white" /></label>
            <button disabled={!productsLoaded || loading === 'generate'} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50"><PackageCheck className="w-4 h-4" />{loading === 'generate' ? 'Generating…' : 'Generate QR labels'}</button>
          </form>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="font-semibold text-lg text-gray-900 dark:text-white">2. Scan to track</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Scan a physical QR label to view its status. Dispatch confirmation is handled in Sales Admin → Load Plans.</p>
          {cameraError && <div role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{cameraError}</div>}
          <label className="mt-5 block text-sm font-medium text-gray-700 dark:text-gray-100">QR unit ID<input value={unitId} onChange={(e) => setUnitId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && refreshTracking()} placeholder="Scan QR code or paste the unit ID" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 dark:border-gray-500 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-400" /></label>
          <div className="mt-4 flex flex-wrap gap-3"><button onClick={() => { setCameraError(''); setCameraOpen(true); }} disabled={cameraOpen || loading !== null} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-500 dark:text-gray-100 dark:hover:bg-gray-700"><Camera className="w-4 h-4" />Scan with camera</button><button onClick={() => refreshTracking()} disabled={loading !== null} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-500 dark:text-gray-100 dark:hover:bg-gray-700"><Search className="w-4 h-4" />Track unit</button></div>
          {cameraOpen && <section className="mt-5 rounded-xl border border-gray-200 p-4 dark:border-gray-700"><div className="mb-3 flex items-center justify-between gap-3"><strong>Point the camera at the QR label</strong><button onClick={stopCamera} className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-sm"><X className="w-4 h-4" />Close</button></div><div id="inventory-qr-dispatch-camera" className="w-full overflow-hidden rounded-xl" /></section>}
          {tracking && <div className="mt-5 rounded-xl border border-gray-200 p-4 dark:border-gray-700 space-y-2"><div className="flex flex-wrap justify-between gap-2"><strong>{tracking.product_name || tracking.product_id}</strong><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass[tracking.movement_status] || 'bg-gray-100 text-gray-700'}`}>{labelForStatus(tracking.movement_status)}</span></div><div className="grid grid-cols-2 gap-3 text-sm"><p><span className="text-gray-500">Destination</span><br />{tracking.destination_id || '-'}</p><p><span className="text-gray-500">Unit sequence</span><br />{tracking.unit_sequence ?? '-'}</p></div></div>}
        </section>
      </div>

      {generated && <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div><h2 className="font-semibold text-lg text-gray-900 dark:text-white">Generated labels</h2><p className="text-sm text-gray-600 dark:text-gray-300">Batch {generated.batch_id} · each print contains only the QR code. In the print window, select your sticker printer and its label-roll paper size.</p></div><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{generated.units.map((unit) => <article key={unit.unit_id} className="rounded-xl border p-4 text-center dark:border-gray-700"><div ref={(node) => { if (node) labelRefs.current.set(unit.unit_id, node); else labelRefs.current.delete(unit.unit_id); }}><QRCodeSVG value={JSON.stringify({ unit_id: unit.unit_id })} size={148} includeMargin /><p className="product mt-3 text-sm font-medium text-gray-900 dark:text-white">{generated.product_name}</p><p className="unit mt-1 break-all font-mono text-xs text-gray-600 dark:text-gray-300">{unit.unit_id}</p></div><div className="mt-3 flex justify-center gap-3"><button onClick={() => printLabel(unit.unit_id)} className="rounded-lg border px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-700">Print this QR</button><button onClick={() => { setUnitId(unit.unit_id); copy(unit.unit_id); }} className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-300"><Clipboard className="w-4 h-4" />Copy unit ID</button></div></article>)}</div></section>}

      {tracking && <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"><h2 className="font-semibold text-lg text-gray-900 dark:text-white">Movement history</h2>{movements.length ? <ol className="mt-4 space-y-3">{movements.map((movement, index) => <li key={movement.movement_id || index} className="flex gap-3 border-l-2 border-indigo-300 pl-4 text-sm"><CheckCircle2 className="w-4 h-4 mt-0.5 text-indigo-600 shrink-0" /><div><strong>{movement.event_type || movement.movement_status_after}</strong><span className="ml-2 text-gray-500">{movement.timestamp ? new Date(movement.timestamp).toLocaleString() : ''}</span><p className="text-gray-500">{movement.from_location || '-'} → {movement.to_location || '-'}</p></div></li>)}</ol> : <p className="mt-4 text-sm text-gray-500">No movement events have been recorded for this unit yet.</p>}</section>}
    </main>
  );
}
