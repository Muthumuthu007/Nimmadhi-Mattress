import {useState,useRef} from 'react';
import {AxiosError} from 'axios';
import {renderToStaticMarkup} from 'react-dom/server';
import UnitProductLabel from './UnitProductLabel';
import {initialUnitLabel,unitLabelPrintDocument} from '../utils/unitLabel';
import {unitApi,UnitLabelDetails,ProductUnit} from '../utils/unitApi';
import {ProductionResponse} from '../types';

export default function ProductionQRDialog({entry,onClose}:{entry:ProductionResponse;onClose:()=>void}){
 const storageKey=`production-qr-details:${entry.push_id}`;
 const initial=()=>{
  try{const saved=localStorage.getItem(storageKey);if(saved)return JSON.parse(saved) as UnitLabelDetails;}catch{/* Use this production's facts if storage is unavailable. */}
  const details=initialUnitLabel(entry.product_name || '');
  const now=new Date();details.manufacturing_month=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  if(entry.custom_size)details.size=['length','width','height'].map(key=>entry.custom_size![key]).join('X');
  return details;
 };
 const [details,setDetails]=useState<UnitLabelDetails>(initial);
 const [choice,setChoice]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[progress,setProgress]=useState(0),[units,setUnits]=useState<ProductUnit[]>([]);
 const frozen=useRef<UnitLabelDetails|null>(null);
 const [locked,setLocked]=useState(()=>!!localStorage.getItem(storageKey));
 const count=Number(entry.quantity_produced);
 const openPrint=()=>{
  const popup=window.open('','_blank','width=460,height=600');
  if(!popup){setError('Allow pop-ups for this website, then try printing again.');return null;}
  popup.document.write('<p>Preparing QR stickers. Please wait…</p>');return popup;
 };
 const print=(popup:Window,ready:ProductUnit[],label:UnitLabelDetails)=>{
  const html=unitLabelPrintDocument(ready.map(unit=>renderToStaticMarkup(<UnitProductLabel details={label} unitId={unit.unit_id}/>)),89,45);
  popup.document.open();popup.document.write(html);popup.document.close();popup.opener=null;
 };
 const generate=async()=>{
  if(!entry.push_id || !entry.product_id || !Number.isSafeInteger(count) || count<1){setError('The saved production details are incomplete. Reopen this entry from production history.');return;}
  if(!details.commodity.trim()||!details.quality.trim()||!details.size.trim()||!details.manufacturing_month||!Number.isFinite(Number(details.mrp))||Number(details.mrp)<=0){setError('Fill commodity, quality, size, manufacturing month and MRP to print the stickers.');return;}
  const popup=openPrint();if(!popup)return;
  const label=frozen.current || {...details};frozen.current=label;
  localStorage.setItem(storageKey,JSON.stringify(label));setLocked(true);setBusy(true);setError('');setProgress(0);
  try{
   const ready:ProductUnit[]=[];
   for(let offset=0;offset<count;offset+=48){
    const response=await unitApi.generate(entry.product_id,Math.min(48,count-offset),`production-qr:${entry.push_id}:${offset}`,label,{pushId:entry.push_id,offset});
    ready.push(...response.data.units);setProgress(ready.length);
   }
   if(ready.length!==count)throw new Error('The complete QR batch is not ready. Retry to recover the same labels.');
   setUnits(ready);print(popup,ready,label);
  }catch(error:unknown){popup.close();const message=error instanceof AxiosError?error.response?.data?.message:error instanceof Error?error.message:undefined;setError(message || 'QR preparation failed. Production is already saved. Retry QR printing only.');}
  finally{setBusy(false);}
 };
 return <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Print production QR labels">
  <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
   <h3 className="text-xl font-bold">Do you need QR labels?</h3>
   <p className="mt-2">{entry.product_name}</p><p className="mt-1 text-sm">Production saved · {count} units · {count} unique stickers</p>
   {!choice?<div className="mt-5 flex gap-3"><button type="button" className="bg-indigo-600 text-white px-4 py-2 rounded" onClick={()=>setChoice(true)}>Yes, print QR labels</button><button type="button" className="border px-4 py-2 rounded" onClick={onClose}>No, skip QR</button></div>:<>
    <p className="text-sm text-gray-500 mt-3">Confirm the sticker values. Quantity comes from this production entry. Sticker size: 89 × 45 mm.</p>
    <div className="grid gap-3 mt-4">{([['commodity','Commodity'],['quality','Quality'],['size','Size in inches'],['manufacturing_month','Manufacturing month'],['mrp','MRP including taxes']] as const).map(([key,title])=><label key={key} className="text-sm font-medium">{title}<input required type={key==='manufacturing_month'?'month':key==='mrp'?'number':'text'} min={key==='mrp'?'0.01':undefined} step={key==='mrp'?'0.01':undefined} value={details[key]} disabled={locked||busy||(key==='size'&&!!entry.custom_size)} onChange={e=>setDetails({...details,[key]:e.target.value})} className="block w-full mt-1 border rounded p-2 bg-white text-gray-900 disabled:bg-gray-100"/></label>)}</div>
    {error&&<p role="alert" className="mt-3 text-red-600">{error} Production is saved; do not push it again.</p>}
    {busy&&<p role="status" className="mt-3">Preparing {progress} of {count} labels…</p>}
    {units.length===count&&<p className="mt-3 text-green-700">All {count} labels are ready. Reprinting uses these same QR codes.</p>}
    <div className="flex gap-3 mt-5"><button type="button" disabled={busy} onClick={()=>{if(units.length===count){const popup=openPrint();if(popup)print(popup,units,frozen.current || details);}else void generate();}} className="rounded bg-indigo-600 text-white px-4 py-2 disabled:opacity-50">{busy?'Preparing…':units.length===count?'Reprint same QR labels':locked?'Retry QR printing':'Generate and print QR labels'}</button><button type="button" disabled={busy} onClick={onClose} className="border rounded px-4 py-2">Close</button></div>
   </>}
  </div>
 </div>;
}
