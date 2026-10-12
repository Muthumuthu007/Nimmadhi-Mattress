import React from 'react';
import {ProductGroupSection} from '../types';
interface Props {
 sections:ProductGroupSection[];
 visibleSections:ProductGroupSection[];
 searching:boolean;
 isOpen:(id:string)=>boolean;
 renderSection:(section:ProductGroupSection & {groupKey:string})=>React.ReactNode;
 onAdd:(parentId:string)=>void;
}
export default function ProductionGroupHierarchy({sections,visibleSections,searching,isOpen,renderSection,onAdd}:Props){
 const ids=new Set(sections.map(s=>s.groupId));
 const visible=new Map(visibleSections.map(s=>[s.groupId,s]));
 const children=(id:string|null)=>id?sections.filter(s=>s.parentId===id):[];
 const matches=(section:ProductGroupSection,seen=new Set<string>()):boolean=>{
  const id=section.groupId || '__ungrouped__';if(seen.has(id))return false;
  const next=new Set(seen).add(id);
  return Boolean(visible.get(section.groupId)?.products.length)||children(section.groupId).some(child=>matches(child,next));
 };
 const count=(section:ProductGroupSection,seen=new Set<string>()):number=>{
  const id=section.groupId || '__ungrouped__';if(seen.has(id))return 0;
  const next=new Set(seen).add(id);
  return (visible.get(section.groupId)?.products.length || 0)+children(section.groupId).reduce((n,child)=>n+count(child,next),0);
 };
 const render=(section:ProductGroupSection,seen=new Set<string>()):React.ReactNode=>{
  const id=section.groupId || '__ungrouped__';if(seen.has(id)|| (searching&&!matches(section)))return null;
  const next=new Set(seen).add(id);const nested=children(section.groupId);
  if(section.groupKind==='MAIN')return <details key={id} open className="border rounded-xl p-4 dark:border-gray-700"><summary className="font-bold text-lg cursor-pointer text-gray-800 dark:text-white">{section.groupName} <span className="text-sm font-normal">({count(section)} products)</span></summary><button className="text-sm text-indigo-600 dark:text-indigo-400 my-3" onClick={()=>onAdd(id)}>+ Add subgroup</button><div className="space-y-6 pl-4">{nested.map(child=>render(child,next))}{!nested.length&&<p className="text-gray-500">No subgroups yet.</p>}</div></details>;
  const current=visible.get(section.groupId) || {...section,products:[]};
  return <div key={id}>{renderSection({...current,groupKey:id})}{(searching||isOpen(id))&&nested.length>0&&<div className="border-l-2 pl-5 mt-4 space-y-6 dark:border-gray-700">{nested.map(child=>render(child,next))}</div>}</div>;
 };
 const roots=sections.filter(s=>s.groupKind==='MAIN');
 const unassigned=sections.filter(s=>s.groupKind!=='MAIN' && (!s.parentId || !ids.has(s.parentId)));
 return <div className="space-y-6">{roots.map(root=>render(root))}{unassigned.some(s=>!searching||matches(s))&&<div className="border border-amber-300 dark:border-amber-700 rounded-xl p-4"><h3 className="font-semibold text-amber-700 dark:text-amber-300 mb-4">Needs classification</h3><p className="text-sm text-gray-500 mb-4">Assign these existing groups to Mattress or Accessories using Place group.</p><div className="space-y-6">{unassigned.map(s=>render(s))}</div></div>}</div>;
}
