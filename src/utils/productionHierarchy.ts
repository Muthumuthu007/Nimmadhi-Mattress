import type {ProductGroup} from './productionApi';
export function productionGroupPath(group:ProductGroup,groups:ProductGroup[]):string {
 const names:string[]=[];const seen=new Set<string>();let current:ProductGroup|undefined=group;
 while(current&&!seen.has(current.group_id)){seen.add(current.group_id);names.unshift(current.name);current=groups.find(item=>item.group_id===current?.parent_id);}
 return names.join(' → ');
}
export function hasProductionMainParent(group:ProductGroup,groups:ProductGroup[]):boolean {
 const seen=new Set<string>();let current:ProductGroup|undefined=group;
 while(current&&!seen.has(current.group_id)){
  if(current.group_kind==='MAIN')return true;
  seen.add(current.group_id);current=groups.find(item=>item.group_id===current?.parent_id);
 }
 return false;
}
