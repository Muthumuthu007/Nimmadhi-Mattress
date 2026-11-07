export interface CostMaterial {id:string;name:string;unit:string}
export function materialCostLine(key:string,quantity:unknown,amount:unknown,materials:CostMaterial[]=[]){
 const exact=materials.find(item=>item.id===key);
 const matches=materials.filter(item=>item.name===key);
 const material=exact || (matches.length===1?matches[0]:undefined);
 const number=(value:unknown)=>value===null||value===undefined||String(value).trim()===''?null:Number(value);
 const qty=number(quantity),cost=number(amount);
 const validQty=qty!==null&&Number.isFinite(qty)&&qty>=0?qty:null;
 const validCost=cost!==null&&Number.isFinite(cost)&&cost>=0?cost:null;
 return {name:material?.name || key,unit:material?.unit || null,quantity:validQty,cost:validCost,rate:validQty!==null&&validQty>0&&validCost!==null?validCost/validQty:null};
}
