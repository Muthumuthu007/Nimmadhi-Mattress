import {validLayerMm,layerOverrides,mergeLayerQuantities} from '../utils/materialLayers';
import ProductionMaterialQuantity from './ProductionMaterialQuantity';
import {isMemoryFoam} from '../utils/memoryFoamThickness';
import {useEffect,useRef,useState} from 'react';
import {apiClient} from '../utils/api';
export interface CustomProductionSelection {enabled:boolean;ready:boolean;layer_mm?:string;material_layers_mm?:Record<string,string>;custom_size?:Record<string,string>;material_quantities?:Record<string,string>;materials_reviewed?:boolean;preview?:CustomProductionPreview}
export interface CustomProductionPreview {product_name:string;custom_size:Record<string,number>;material_layers_mm:Record<string,number>;materials:{material_id:string;layer_mm?:number|null;material_name:string;unit:string;quantity_per_unit:number;available_stock:number;rate:number;calculation:string}[]}
export default function CustomProductionEditor({productId,onChange,disabled}:{productId:string;onChange:(value:CustomProductionSelection)=>void;disabled:boolean}){
 const [enabled,setEnabled]=useState(false),[size,setSize]=useState({length:'',width:'',height:''});
 const [preview,setPreview]=useState<CustomProductionPreview|null>(null),[quantities,setQuantities]=useState<Record<string,string>>({});
 const [reviewed,setReviewed]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const [layerMm,setLayerMm]=useState('25');
 const [materialLayers,setMaterialLayers]=useState<Record<string,string>>({});
 const revision=useRef(0);
 const layersApplied=validLayerMm(layerMm)&&layerOverrides(materialLayers)!==null&&Object.entries(materialLayers).every(([id,value])=>Number(preview?.material_layers_mm?.[id])===Number(value));
 const valid=Boolean(preview)&&layersApplied&&Object.values(quantities).every(value=>value.trim()!==''&&Number.isFinite(Number(value))&&Number(value)>=0)&&Object.values(quantities).some(value=>Number(value)>0);
 useEffect(()=>{onChange({enabled,layer_mm:layerMm,material_layers_mm:materialLayers,ready:valid&&reviewed&&!loading,custom_size:size,material_quantities:quantities,materials_reviewed:reviewed,preview:preview || undefined});},[enabled,valid,reviewed,loading,size,layerMm,materialLayers,quantities,preview,onChange]);
 const calculate=async()=>{
  if(!layerMm.trim()||!Number.isFinite(Number(layerMm))||Number(layerMm)<=0||Number(layerMm)>1000){setError('Enter a layer thickness greater than 0 and at most 1000 mm.');return;}
  if(Object.values(size).some(value=>!value.trim()||!Number.isFinite(Number(value))||Number(value)<=0||Number(value)>1000)){setError('Enter positive length, width and thickness in inches (up to 1000).');return;}
  const overrides=layerOverrides(materialLayers);if(!overrides){setError('Enter a valid thickness for each raw material.');return;}
  const current=++revision.current;setLoading(true);setError('');setReviewed(false);setPreview(null);
  try{const result=await apiClient.post<CustomProductionPreview>('/api/production/custom/preview/',{product_id:productId,custom_size:size,layer_mm:layerMm,material_layers_mm:overrides});if(current!==revision.current)return;setPreview(result.data);setQuantities(Object.fromEntries(result.data.materials.map(line=>[line.material_id,String(line.quantity_per_unit)])));}
  catch(error:unknown){if(current===revision.current)setError((error as {response?:{data?:{error?:string}}}).response?.data?.error || 'Unable to calculate materials. Please retry.');}
  finally{if(current===revision.current)setLoading(false);}
 };
 const recalculateMaterial=async()=>{
  if(!preview||layersApplied)return;
  const overrides=layerOverrides(materialLayers);
  if(!overrides){setError('Each material thickness must be greater than 0 and at most 1000 mm.');return;}
  const previous=preview.material_layers_mm || {};
  const current=++revision.current;setLoading(true);setError('');setReviewed(false);
  try{
   const result=await apiClient.post<CustomProductionPreview>('/api/production/custom/preview/',{product_id:productId,custom_size:size,layer_mm:layerMm,material_layers_mm:overrides});
   if(current!==revision.current)return;
   setQuantities(values=>mergeLayerQuantities(values,previous,result.data.materials));
   setPreview(result.data);
  }catch(error:unknown){if(current===revision.current)setError((error as {response?:{data?:{error?:string}}}).response?.data?.error || 'Unable to recalculate this material. Retry the calculation.');}
  finally{if(current===revision.current)setLoading(false);}
 };
 return <section className="rounded-lg border border-indigo-200 p-4 space-y-3 dark:border-indigo-700">
  <label className="flex items-start gap-2 font-semibold text-gray-900 dark:text-white"><input className="mt-1 h-4 w-4 shrink-0" type="checkbox" checked={enabled} disabled={disabled} onChange={event=>setEnabled(event.target.checked)}/>Custom size for this production entry</label>
  {enabled&&<><p className="text-sm text-gray-600 dark:text-gray-300">Uses the selected product’s raw materials. The standard product size and recipe remain unchanged.</p>
   <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] items-end gap-3">{([['length','Length'],['width','Width'],['height','Thickness']] as const).map(([key,label])=><label key={key} className="flex min-w-0 flex-col gap-1 text-sm font-medium text-gray-800 dark:text-gray-100"><span>{label}<span className="block text-xs font-normal text-gray-500 dark:text-gray-400">inches</span></span><input data-production-field={key} type="number" min="0.01" max="1000" step="any" value={size[key]} disabled={disabled} onChange={event=>{revision.current++;setSize({...size,[key]:event.target.value});setPreview(null);setReviewed(false);setLoading(false);}} className="block h-11 w-full min-w-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"/></label>)}</div>
   <label className="block text-sm text-gray-900 dark:text-white">Default layer thickness (mm)<input aria-label="Default layer thickness (mm)" type="number" min="0.01" max="1000" step="any" value={layerMm} disabled={disabled} onChange={event=>{revision.current++;setLayerMm(event.target.value);setPreview(null);setReviewed(false);setLoading(false);}} className="mt-1 block w-full rounded border bg-white p-2 text-gray-900"/><span className="text-xs">Starts at 25 mm. Edit individual raw-material thicknesses in the calculated list below.</span></label>
   <button data-production-field="calculate" type="button" disabled={disabled||loading} onClick={calculate} className="w-full rounded-md bg-indigo-600 px-3 py-2.5 text-sm font-medium leading-5 text-white disabled:opacity-50">{loading?'Calculating…':'Calculate materials for custom size'}</button>
   {loading&&preview&&<p role="status" className="text-sm text-indigo-700">Recalculating changed materials…</p>}
   {error&&<p role="alert" className="text-red-600">{error}</p>}
   {preview&&<><h3 className="font-semibold text-gray-900 dark:text-white">{preview.product_name}</h3><p className="text-sm text-gray-600 dark:text-gray-300">Quantities below are per finished unit. Review materials without a formula manually.</p><div className="space-y-3">{preview.materials.map(line=><div key={line.material_id} className="rounded border border-gray-200 p-3 text-gray-800 dark:text-gray-100"><h4 className="mb-2 font-semibold">{line.material_name}</h4>{line.layer_mm!=null&&<label className="mb-3 block text-sm font-medium">Layer thickness (mm)<input aria-label={`${line.material_name} layer thickness (mm)`} type="number" min="0.01" max="1000" step="any" value={materialLayers[line.material_id]??String(line.layer_mm)} disabled={disabled} onChange={event=>{revision.current++;setMaterialLayers(values=>({...values,[line.material_id]:event.target.value}));setReviewed(false);setLoading(false);}} onBlur={()=>{void recalculateMaterial();}} className="mt-1 block w-full rounded border bg-white p-2 text-gray-900"/></label>}<label className="block text-sm font-semibold">{line.material_name} · {line.unit || 'unit'}<input data-production-field="material" aria-label={`${line.material_name} quantity per unit`} type="number" min="0" step="any" value={quantities[line.material_id]} disabled={disabled||loading} onChange={event=>{setQuantities({...quantities,[line.material_id]:event.target.value});setReviewed(false);}} className="block mt-1 w-full rounded border bg-white p-2 text-gray-900"/></label>{isMemoryFoam(line.material_name)&&<div className="mt-2 text-sm"><ProductionMaterialQuantity productName={preview.product_name} materialName={line.material_name} quantity={Number(quantities[line.material_id])} unit={line.unit}/></div>}<p className="text-xs mt-1">{line.calculation==='formula'?'Calculated from Casting rules':'No formula — standard quantity carried forward; check manually'} · Available: {line.available_stock} {line.unit}</p><p className="text-xs">Rate: ₹{line.rate} / {line.unit || 'unit'} · Material cost per finished unit: ₹{Number.isFinite(Number(quantities[line.material_id]))?(Number(quantities[line.material_id])*Number(line.rate)).toFixed(2):'—'}</p></div>)}</div>
    <label className="flex gap-2 text-sm text-gray-900 dark:text-white"><input data-production-field="review" type="checkbox" checked={reviewed} disabled={disabled||loading||!valid} onChange={event=>setReviewed(event.target.checked)}/>I have checked the quantities, including materials without a formula.</label></>}
  </>}
 </section>;
}
