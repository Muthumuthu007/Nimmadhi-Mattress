export interface DispatchGroupMetadata {
 production_group_path?:{group_id:string;name:string}[];
}
export function groupDispatchRows<T extends DispatchGroupMetadata>(rows:T[]){
 const groups=new Map<string,{key:string;title:string;rows:T[]}>();
 for(const row of rows){
  const path=row.production_group_path || [];
  const key=JSON.stringify(path.map(group=>group.group_id));
  const group=groups.get(key) || {key,title:path.map(group=>group.name).join(' → ') || 'Ungrouped / product no longer mapped',rows:[]};
  group.rows.push(row);groups.set(key,group);
 }
 return [...groups.values()].sort((a,b)=>a.key==='[]'?1:b.key==='[]'?-1:a.title.localeCompare(b.title,undefined,{numeric:true}));
}
export const dispatchGroupTitle=(row:DispatchGroupMetadata)=>row.production_group_path?.map(group=>group.name).join(' → ') || 'Ungrouped / product no longer mapped';
