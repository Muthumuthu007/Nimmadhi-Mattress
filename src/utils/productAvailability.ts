export type Availability='NIM'|'OUT'|'BOTH'|'INHERIT';
export const availabilityLabels:Record<string,string>={NIM:'NIM only',OUT:'OUT only',BOTH:'Both',INHERIT:'Inherit group setting'};
export interface AvailabilityGroup {group_id:string;name:string;parent_id?:string|null;outlet_availability?:Availability;availability_version?:number}
export interface AvailabilityProduct {product_id:string;product_name:string;group_id?:string|null;outlet_availability?:Availability;availability_version?:number}
export function resolveAvailability(product:AvailabilityProduct,groups:AvailabilityGroup[]){
 if(product.outlet_availability&&product.outlet_availability!=='INHERIT')return {value:product.outlet_availability,source:'Product override'};
 const seen=new Set<string>();let id=product.group_id;
 while(id&&!seen.has(id)){seen.add(id);const group=groups.find(g=>g.group_id===id);if(!group)break;if(group.outlet_availability&&group.outlet_availability!=='INHERIT')return {value:group.outlet_availability,source:`Inherited from ${group.name}`};id=group.parent_id;}
 return {value:'BOTH',source:'Default: Both'};
}
