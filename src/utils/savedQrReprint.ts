export interface SavedQRBatch {batch_id:string;product_id:string;product_name:string;generated_at:string;generated_by?:string;quantity:number;group_id?:string;group_path?:string;receipt_reference?:string;unit_ids?:string[];first_unit_id?:string;last_unit_id?:string;reprint_ready:boolean;reprint_message?:string;label_details?:{commodity:string;quality:string;size:string;manufacturing_month:string;mrp:string};units?:{unit_id:string;qr_payload?:{unit_id:string}}[]}
export function savedQRSelection(batch:SavedQRBatch,ids:string[]){
 if(!batch.reprint_ready||!batch.label_details||!batch.units?.length)throw Error(batch.reprint_message||'The original sticker details are unavailable.');
 if(!ids.length||new Set(ids).size!==ids.length)throw Error('Select one or more distinct saved QR labels.');
 const byId=new Map(batch.units.map(unit=>[unit.unit_id,unit]));
 if(byId.size!==batch.units.length||batch.units.length!==Number(batch.quantity)||ids.some(id=>!byId.has(id)))throw Error('Saved QR labels are incomplete. Reopen this batch before printing.');
 return ids.map(id=>byId.get(id)!);
}
