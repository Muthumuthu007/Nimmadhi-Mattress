import {materialCostLine,CostMaterial} from '../utils/materialCost';
const qtyText=(value:number)=>value.toLocaleString('en-IN',{maximumFractionDigits:6});
const money=(value:number)=>`₹${value.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export default function MaterialCostLine({materialKey,quantity,amount,materials=[]}:{materialKey:string;quantity:unknown;amount:unknown;materials?:CostMaterial[]}){
 const line=materialCostLine(materialKey,quantity,amount,materials);
 return <div className="rounded-lg border border-gray-100 bg-white p-3 space-y-1 min-w-0">
  <p className="text-sm font-semibold text-gray-800 break-words">{line.name}</p>
  <div className="flex flex-wrap items-start justify-between gap-2 text-sm">
   <span className="text-gray-700">Required: <strong>{line.quantity===null?'Not recorded':qtyText(line.quantity)} {line.unit || ''}</strong></span>
   <span className="font-bold text-green-700">{line.cost===null?'Cost not recorded':money(line.cost)}</span>
  </div>
  <p className="text-xs text-gray-600">{line.rate===null?'Unit rate not recorded':`Rate used: ₹${qtyText(line.rate)} / ${line.unit || 'unit'}`}{!line.unit?' · Unit not recorded':''}</p>
  {line.rate!==null && <p className="text-xs text-gray-500">{qtyText(line.quantity!)} {line.unit || 'units'} × ₹{qtyText(line.rate)} = {money(line.cost!)}</p>}
 </div>;
}
