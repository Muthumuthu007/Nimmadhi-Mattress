import React,{useState} from 'react';
import {useProductPath} from '../hooks/useProductPath';
import {productListTree,ProductListNode} from '../utils/productListing';
interface Props<T>{items:T[];renderItem?:(item:T,index:number)=>React.ReactNode;renderItems?:(items:T[])=>React.ReactNode;contentClassName?:string;expanded?:boolean}
export default function GroupedProductList<T extends object>({items,renderItem,renderItems,contentClassName='space-y-4',expanded=true}:Props<T>){
 const resolve=useProductPath();const tree=productListTree(items,item=>resolve(item as Record<string,unknown>));
 return <div className="space-y-4 col-span-full">{tree.map(node=><ProductBranch key={node.id} node={node} renderItem={renderItem} renderItems={renderItems} contentClassName={contentClassName} expanded={expanded} depth={0}/>)}</div>;
}
function ProductBranch<T>({node,renderItem,renderItems,contentClassName,expanded,depth}:Omit<Props<T>,'items'>&{node:ProductListNode<T>;depth:number}){
 const [open,setOpen]=useState(expanded || depth===0);
 return <section className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"><button type="button" aria-expanded={open} onClick={()=>setOpen(!open)} className={`w-full text-left px-4 py-3 font-semibold flex items-center justify-between gap-3 ${depth===0?'bg-indigo-50 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200':'bg-gray-50 text-gray-800 dark:bg-gray-800 dark:text-gray-100'}`}><span>{open?'▾':'▸'} {node.name}</span><small className="font-normal">{node.count} products</small></button>{open&&<div className="p-3 space-y-4">{node.items.length>0&&(renderItems?renderItems(node.items.map(entry=>entry.item)):<div className={contentClassName}>{node.items.map(({item,index})=><React.Fragment key={index}>{renderItem?.(item,index)}</React.Fragment>)}</div>)}{node.children.map(child=><ProductBranch key={child.id} node={child} renderItem={renderItem} renderItems={renderItems} contentClassName={contentClassName} expanded={expanded} depth={depth+1}/>)}</div>}</section>;
}
export function ProductGroupOptions<T extends object>({items,id,name}:{items:T[];id:(item:T)=>string;name:(item:T)=>string}){
 const resolve=useProductPath();const groups=new Map<string,{label:string;items:T[]}>();
 for(const item of items){const path=resolve(item as Record<string,unknown>),key=path.map(part=>part.id).join('/');if(!groups.has(key))groups.set(key,{label:path.map(part=>part.name).join(' → '),items:[]});groups.get(key)!.items.push(item);}
 return <>{[...groups].sort(([,a],[,b])=>{const rank=(label:string)=>label.toLowerCase().startsWith('mattress')?0:label.toLowerCase().startsWith('accessories')?1:2;return rank(a.label)-rank(b.label)||a.label.localeCompare(b.label);}).map(([key,group])=><optgroup key={key} label={group.label}>{group.items.map(item=><option key={id(item)} value={id(item)}>{name(item)}</option>)}</optgroup>)}</>;
}
export function ProductPathLabel({item}:{item:Record<string,unknown>}){const resolve=useProductPath();return <small className="block text-gray-500 dark:text-gray-400">{resolve(item).map(part=>part.name).join(' → ')}</small>;}

export function GroupedProductRows<T extends object>({items,columns,renderItem}:{items:T[];columns:number;renderItem:(item:T,index:number)=>React.ReactNode}){
 const resolve=useProductPath();const tree=productListTree(items,item=>resolve(item as Record<string,unknown>));
 const render=(node:ProductListNode<T>,depth=0):React.ReactNode=><React.Fragment key={node.id}><tr><th colSpan={columns} scope="rowgroup" className="bg-indigo-50 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-100 text-left py-3" style={{paddingLeft:16+depth*16}}>{node.name}</th></tr>{node.items.map(({item,index})=><React.Fragment key={index}>{renderItem(item,index)}</React.Fragment>)}{node.children.map(child=>render(child,depth+1))}</React.Fragment>;
 return <>{tree.map(root=>render(root))}</>;
}
