import {useEffect, useMemo, useRef, useState} from 'react';
import {ArrowRightLeft, Loader2, X} from 'lucide-react';
import {productGroupApi, ProductGroup} from '../utils/productionApi';
import {productionGroupPath, hasProductionMainParent} from '../utils/productionHierarchy';
import {ProductGroupSection} from '../types';
import {handleApiError} from '../utils/api';

const UNGROUPED='__ungrouped__';
interface Props {sections:ProductGroupSection[];initialSource?:string|null;onClose:()=>void;onSuccess:(count:number)=>void}
export default function TransferProductionProductsModal({sections,initialSource,onClose,onSuccess}:Props) {
 const [groups,setGroups]=useState<ProductGroup[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [source,setSource]=useState(initialSource===undefined?'':initialSource===null?UNGROUPED:initialSource);
 const [target,setTarget]=useState(''),[search,setSearch]=useState(''),[selected,setSelected]=useState<Set<string>>(new Set());
 const [busy,setBusy]=useState(false),[completed,setCompleted]=useState<Set<string>>(new Set());
 const completedRef=useRef(new Set<string>());
 useEffect(()=>{let alive=true;productGroupApi.getHierarchy().then(result=>{if(alive)setGroups(result.data.groups || []);}).catch(err=>{if(alive)setError(handleApiError(err));}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[]);
 const sourceOptions=sections.filter(section=>!groups.some(group=>group.group_id===section.groupId&&group.group_kind==='MAIN'));
 const sourceSection=sourceOptions.find(section=>(section.groupId ?? UNGROUPED)===source);
 const destinationOptions=groups.filter(group=>group.group_id!==source&&group.group_kind!=='MAIN'&&hasProductionMainParent(group,groups));
 const products=useMemo(()=>sourceSection?.products || [],[sourceSection]);
 const shown=products.filter(product=>product.name.toLowerCase().includes(search.trim().toLowerCase())||product.id.toLowerCase().includes(search.trim().toLowerCase()));
 const pendingShown=shown.filter(product=>!completed.has(product.id));
 const allShownSelected=pendingShown.length>0&&pendingShown.every(product=>selected.has(product.id));
 const path=(id:string|null,name:string)=>{const group=groups.find(row=>row.group_id===id);return group?productionGroupPath(group,groups):name;};
 const changeSource=(value:string)=>{setSource(value);setTarget('');setSearch('');setSelected(new Set());setError('');};
 const close=()=>{if(busy)return;if(completedRef.current.size)onSuccess(completedRef.current.size);onClose();};
 const toggle=(id:string)=>setSelected(current=>{const next=new Set(current);if(next.has(id))next.delete(id);else next.add(id);return next;});
 const submit=async()=>{
  if(!source||!target||!selected.size)return;
  setBusy(true);setError('');
  const ids=[...selected].filter(id=>!completedRef.current.has(id));
  try {
   for(let offset=0;offset<ids.length;offset+=98){
    const batch=ids.slice(offset,offset+98);
    const result=await productGroupApi.transferProducts(batch,target,source===UNGROUPED?null:source);
    for(const id of result.data.processed_product_ids)completedRef.current.add(id);
    setCompleted(new Set(completedRef.current));
    setSelected(current=>new Set([...current].filter(id=>!completedRef.current.has(id))));
   }
   onSuccess(completedRef.current.size);onClose();
  } catch(err) {
   setError(`${handleApiError(err)}${completedRef.current.size?` ${completedRef.current.size} products have already been transferred. Retry the remaining selection, or close to refresh the list.`:' No transfer was confirmed. You can safely retry the same selection.'}`);
  } finally {setBusy(false);}
 };
 const fieldClass='w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white';
 return <div role="dialog" aria-modal="true" aria-labelledby="transfer-products-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6">
 <section className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
  <header className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-700"><h2 id="transfer-products-title" className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white"><ArrowRightLeft size={20}/>Transfer products</h2><button type="button" aria-label="Close transfer products" disabled={busy} onClick={close} className="rounded-lg p-2 text-gray-500 disabled:opacity-50"><X size={20}/></button></header>
  <div className="space-y-4 overflow-y-auto p-5">
   <p className="text-sm text-gray-600 dark:text-gray-300">Move one or more products from a source subgroup to a destination subgroup. Product IDs, quantities, recipes, and transaction history are preserved.</p>
   {loading?<p role="status" className="text-gray-600 dark:text-gray-300">Loading subgroups…</p>:<>
   <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-200">Source subgroup<select aria-label="Source subgroup" className={fieldClass} value={source} disabled={busy||completed.size>0} onChange={event=>changeSource(event.target.value)}><option value="">Choose source subgroup</option>{sourceOptions.map(section=><option key={section.groupId ?? UNGROUPED} value={section.groupId ?? UNGROUPED}>{path(section.groupId,section.groupName)} ({section.products.length})</option>)}</select></label>
   <label className="space-y-1 text-sm font-medium text-gray-700 dark:text-gray-200">Destination subgroup<select aria-label="Destination subgroup" className={fieldClass} value={target} disabled={busy||!source||completed.size>0} onChange={event=>setTarget(event.target.value)}><option value="">Choose destination subgroup</option>{destinationOptions.map(group=><option key={group.group_id} value={group.group_id}>{productionGroupPath(group,groups)}</option>)}</select></label></div>
   {source&&<><label className="block space-y-1 text-sm font-medium text-gray-700 dark:text-gray-200">Search source products<input type="search" className={fieldClass} placeholder="Product name or ID" disabled={busy} value={search} onChange={event=>setSearch(event.target.value)}/></label><div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-700 dark:text-gray-200"><label className="flex min-h-[44px] items-center gap-2"><input type="checkbox" checked={allShownSelected} disabled={busy||!pendingShown.length} onChange={()=>setSelected(current=>{const next=new Set(current);for(const product of pendingShown){if(allShownSelected)next.delete(product.id);else next.add(product.id);}return next;})}/>Select all shown</label><span>{selected.size} selected · {completed.size} transferred</span></div>
   <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-gray-200 p-2 dark:border-gray-600">{shown.map(product=><label key={product.id} className="flex cursor-pointer items-start gap-3 rounded-lg p-3 text-sm text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-700"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0" disabled={busy||completed.has(product.id)} checked={selected.has(product.id)} onChange={()=>toggle(product.id)}/><span className="min-w-0 break-words">{product.name}{completed.has(product.id)&&<span className="ml-2 text-green-600">Transferred</span>}</span></label>)}{!shown.length&&<p className="p-3 text-sm text-gray-500">{products.length?'No products match your search.':'No products in this subgroup.'}</p>}</div></>}
   </>}
   {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</p>}
   {source&&target&&selected.size>0&&<p className="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200">Transfer {selected.size} {selected.size===1?'product':'products'} from {path(source,sourceSection?.groupName || 'Ungrouped')} to {path(target,'destination subgroup')}.</p>}
  </div>
  <footer className="flex flex-wrap justify-end gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-700"><button type="button" disabled={busy} onClick={close} className="min-h-[44px] rounded-xl border border-gray-300 px-4 py-2 text-gray-700 disabled:opacity-50 dark:text-gray-200">{completed.size?'Close and refresh':'Cancel'}</button><button type="button" disabled={loading||busy||!source||!target||!selected.size} onClick={submit} className="flex min-h-[44px] items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy&&<Loader2 className="h-4 w-4 animate-spin"/>}{busy?'Transferring…':`Transfer ${selected.size || ''} ${selected.size===1?'product':'products'}`}</button></footer>
 </section></div>;
}
