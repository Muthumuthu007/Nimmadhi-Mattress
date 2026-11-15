export interface ProductGroupNode {groupId:string|null;groupName:string;parentId?:string|null;groupKind?:string;products?:{id?:string}[]}
export interface ProductPathPart {id:string;name:string}
export interface ProductListNode<T>{id:string;name:string;items:{item:T;index:number}[];children:ProductListNode<T>[];count:number}
const unclassified={id:'__unclassified__',name:'Needs classification'};
export function productPath(row:Record<string,unknown>,sections:ProductGroupNode[],lookup?:{groups:Map<string,ProductGroupNode>;products:Map<string,ProductGroupNode>}):ProductPathPart[]{
 const saved=row.production_group_path || row.groupAncestors;
 if(Array.isArray(saved)&&saved.length&&saved.every(part=>part&&(part.group_id || part.id)&&part.name))return saved.map(part=>({id:String(part.group_id || part.id),name:String(part.name)}));
 const ids=[row.product_id,row.productId,row.id,row.base_product_id,row.baseProductId,row.standard_product_id,row.source_product_id].filter(Boolean).map(String);
 let current=lookup?(lookup.groups.get(String(row.group_id || row.groupId || '')) || ids.map(id=>lookup.products.get(id)).find(Boolean)):(sections.find(section=>section.groupId===(row.group_id || row.groupId)) || sections.find(section=>section.products?.some(product=>ids.includes(String(product.id)))));
 const path:ProductPathPart[]=[],seen=new Set<string>();
 while(current?.groupId&&!seen.has(current.groupId)){seen.add(current.groupId);path.unshift({id:current.groupId,name:current.groupName});current=lookup?lookup.groups.get(String(current.parentId || '')):sections.find(section=>section.groupId===current?.parentId);}
 if(!path.length)return [unclassified];
 const root=sections.find(section=>section.groupId===path[0].id);
 return root?.groupKind==='MAIN'?path:[unclassified,...path];
}
export function productListTree<T>(items:T[],resolve:(item:T)=>ProductPathPart[]):ProductListNode<T>[]{
 const roots:ProductListNode<T>[]=[];
 items.forEach((item,index)=>{let siblings=roots,node:ProductListNode<T>|undefined;
  for(const part of resolve(item)){node=siblings.find(candidate=>candidate.id===part.id);if(!node){node={id:part.id,name:part.name,items:[],children:[],count:0};siblings.push(node);}node.count++;siblings=node.children;}
  node?.items.push({item,index});
 });
 const rank=(name:string)=>name.toLowerCase()==='mattress'?0:name.toLowerCase()==='accessories'?1:name==='Needs classification'?3:2;
 const sort=(nodes:ProductListNode<T>[])=>{nodes.sort((a,b)=>rank(a.name)-rank(b.name)||a.name.localeCompare(b.name,undefined,{numeric:true}));nodes.forEach(node=>sort(node.children));};sort(roots);return roots;
}

export function createProductPathResolver(sections:ProductGroupNode[]){
 const groups=new Map(sections.filter(section=>section.groupId).map(section=>[String(section.groupId),section]));
 const products=new Map<string,ProductGroupNode>();
 for(const section of sections)for(const product of section.products || [])if(product.id&&!products.has(String(product.id)))products.set(String(product.id),section);
 return (row:Record<string,unknown>)=>productPath(row,sections,{groups,products});
}
