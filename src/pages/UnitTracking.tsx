import { useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import UnitProductLabel from '../components/UnitProductLabel';
import {initialUnitLabel,unitLabelPrintDocument} from '../utils/unitLabel';
import type {UnitLabelDetails} from '../utils/unitApi';
import { Camera, CheckCircle2, Clipboard, PackageCheck, QrCode, Search, X } from 'lucide-react';
import { productionApi, ProductionProduct } from '../utils/productionApi';
import { handleApiError } from '../utils/api';
import { newIdempotencyKey, UnitGenerationResponse, unitApi } from '../utils/unitApi';

const statusClass: Record<string, string> = {
  READY_FOR_DISPATCH: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  IN_TRANSIT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  RECEIVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
};

const labelForStatus = (status?: string) => status?.split('_').join(' ') || '-';

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
  unit_id?:string;
  label_details?:UnitLabelDetails;
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

function selectedProductList(products:ProductionProduct[],matches:ProductionProduct[],selected:string){
 const current=products.find(product=>product.product_id===selected);
 return current&&!matches.some(product=>product.product_id===selected)?[current,...matches]:matches;
}

export default function UnitTracking() {
  const [products, setProducts] = useState<ProductionProduct[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [productId, setProductId] = useState('');
  const [productSearch,setProductSearch]=useState('');
  const matchingProducts=useMemo(()=>{const words=productSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);return products.filter(product=>words.every(word=>`${product.product_name} ${product.product_id}`.toLowerCase().includes(word)));},[products,productSearch]);
  const selectableProducts=selectedProductList(products,matchingProducts,productId);
  const [quantity, setQuantity] = useState(1);
  const [labelDetails,setLabelDetails]=useState<UnitLabelDetails>(()=>initialUnitLabel(''));
  const [labelWidth,setLabelWidth]=useState(89),[labelHeight,setLabelHeight]=useState(45);
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
    if(!labelDetails.commodity.trim() || !labelDetails.quality.trim() || !labelDetails.size.trim() || !labelDetails.manufacturing_month || !Number.isFinite(Number(labelDetails.mrp)) || Number(labelDetails.mrp)<=0){setError('Complete commodity, quality, size, manufacturing month and MRP before generating labels.');return;}
    const fingerprint = JSON.stringify([productId,quantity,labelDetails]);
    if (!generateKey.current || generateKey.current.fingerprint !== fingerprint) {
      generateKey.current = { fingerprint, key: newIdempotencyKey('generate-units') };
    }
    setLoading('generate');
    try {
      const response = await unitApi.generate(productId, Number(quantity), generateKey.current.key,labelDetails);
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
    try{printWindow.document.write(unitLabelPrintDocument(label.outerHTML,labelWidth,labelHeight));}
    catch(error){printWindow.close();setError(error instanceof Error?error.message:'Unable to prepare the label.');return;}
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Search products<input type="search" value={productSearch} onChange={event=>setProductSearch(event.target.value)} disabled={!productsLoaded} placeholder="Type product name or size…" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 disabled:opacity-60 dark:border-gray-500 dark:bg-gray-900 dark:text-white"/></label>
            {productsLoaded && <p role="status" className="text-sm text-gray-600 dark:text-gray-300">{matchingProducts.length?`${matchingProducts.length} matching product${matchingProducts.length===1?'':'s'}`:'No products match your search.'}{productSearch && productId && !matchingProducts.some(product=>product.product_id===productId)?' Your selected product is retained below.':''}</p>}
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Product<select required value={productId} onChange={(e) => {setProductId(e.target.value);const product=products.find(p=>p.product_id===e.target.value);setLabelDetails(initialUnitLabel(product?.product_name || '',product?.mrp));}} disabled={!productsLoaded} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-500 dark:bg-gray-900 dark:text-white"><option value="">{productsLoaded ? 'Choose a product' : 'Load products first'}</option>{selectableProducts.map((product) => <option key={product.product_id} value={product.product_id}>{product.product_name} {product.max_produce != null ? `— max produce ${product.max_produce}` : ''}</option>)}</select></label>
            {selectedProduct && <p className="text-sm text-gray-600 dark:text-gray-300">Selected product: <strong>{selectedProduct.product_name}</strong></p>}
            <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-2 font-semibold text-gray-900 dark:text-white">Printed product details</legend>{([['commodity','Name of the commodity'],['quality','Quality'],['size','Size in inches'],['manufacturing_month','Manufacturing month'],['mrp','MRP including taxes (Rs.)']] as const).map(([key,title])=><label key={key} className="block text-sm font-medium text-gray-700 dark:text-gray-100">{title}<input required maxLength={100} type={key==='manufacturing_month'?'month':key==='mrp'?'number':'text'} min={key==='mrp'?'0.01':undefined} step={key==='mrp'?'0.01':undefined} value={labelDetails[key]} onChange={e=>setLabelDetails({...labelDetails,[key]:e.target.value})} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-500 dark:bg-gray-900 dark:text-white"/></label>)}</fieldset><p className="text-xs text-gray-600 dark:text-gray-300">Review the suggested commodity, quality and size. Enter the actual manufacturing month; QR generation date is not the manufacturing date. These details are saved with each generated unit.</p>
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
          {tracking && <div className="mt-5 rounded-xl border border-gray-200 p-4 dark:border-gray-700 space-y-2"><div className="flex flex-wrap justify-between gap-2"><strong>{tracking.product_name || tracking.product_id}</strong><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass[tracking.movement_status || ''] || 'bg-gray-100 text-gray-700'}`}>{labelForStatus(tracking.movement_status)}</span></div><div className="grid grid-cols-2 gap-3 text-sm"><p><span className="text-gray-500">Destination</span><br />{tracking.destination_id || '-'}</p><p><span className="text-gray-500">Unit sequence</span><br />{tracking.unit_sequence ?? '-'}</p></div>{tracking.label_details&&<UnitProductLabel details={tracking.label_details} unitId={tracking.unit_id || unitIdFromScan(unitId)}/>}</div>}
        </section>
      </div>

      {generated && <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"><div><h2 className="font-semibold text-lg text-gray-900 dark:text-white">Generated labels</h2><p className="text-sm text-gray-600 dark:text-gray-300">Batch {generated.batch_id} · each label includes product details and its unique QR. One white sticker per product, with only the six values stacked vertically, without field names. The printer stock is 89 × 45 mm. The values are rotated automatically to read vertically when the sticker is turned upright. Keep the printer at 89 × 45 mm with no additional rotation; use 100% scale, zero margins and no browser headers or footers.</p></div><div className="mt-4 flex flex-wrap gap-3">{([['Width (mm)',labelWidth,setLabelWidth],['Height (mm)',labelHeight,setLabelHeight]] as const).map(([title,value,setter])=><label key={title} className="text-sm font-medium text-gray-700 dark:text-gray-100">{title}<input type="number" min={title.startsWith('Width')?40:35} max={title.startsWith('Width')?200:150} value={value} onChange={e=>setter(Number(e.target.value))} className="ml-2 w-20 rounded border border-gray-300 bg-white px-2 py-1 text-gray-900"/></label>)}</div><div className="mt-5 grid gap-4 lg:grid-cols-2">{generated.units.map((unit) => <article key={unit.unit_id} className="rounded-xl border p-4 text-center dark:border-gray-700"><div ref={(node) => { if (node) labelRefs.current.set(unit.unit_id, node); else labelRefs.current.delete(unit.unit_id); }}>{generated.label_details?<UnitProductLabel details={generated.label_details} unitId={unit.unit_id}/>:<p>Product label details are missing. Generate a new batch with the label fields completed.</p>}</div><div className="mt-3 flex justify-center gap-3"><button onClick={() => printLabel(unit.unit_id)} className="rounded-lg border px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-700">Print this QR</button><button onClick={() => { setUnitId(unit.unit_id); copy(unit.unit_id); }} className="inline-flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-300"><Clipboard className="w-4 h-4" />Copy unit ID</button></div></article>)}</div></section>}

      {tracking && <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"><h2 className="font-semibold text-lg text-gray-900 dark:text-white">Movement history</h2>{movements.length ? <ol className="mt-4 space-y-3">{movements.map((movement, index) => <li key={movement.movement_id || index} className="flex gap-3 border-l-2 border-indigo-300 pl-4 text-sm"><CheckCircle2 className="w-4 h-4 mt-0.5 text-indigo-600 shrink-0" /><div><strong>{movement.event_type || movement.movement_status_after}</strong><span className="ml-2 text-gray-500">{movement.timestamp ? new Date(movement.timestamp).toLocaleString() : ''}</span><p className="text-gray-500">{movement.from_location || '-'} → {movement.to_location || '-'}</p></div></li>)}</ol> : <p className="mt-4 text-sm text-gray-500">No movement events have been recorded for this unit yet.</p>}</section>}
    </main>
  );
}
