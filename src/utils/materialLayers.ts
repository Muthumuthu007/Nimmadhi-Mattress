export function validLayerMm(value:unknown):boolean {
 if(typeof value!=='string'&&typeof value!=='number')return false;
 return String(value).trim()!==''&&Number.isFinite(Number(value))&&Number(value)>0&&Number(value)<=1000;
}
export function materialDensity(material:{name?:string;density?:unknown}):number|null {
 if(validLayerDensity(material.density))return Number(material.density);
 const match=/(?:^|[^\d.])(\d+(?:\.\d+)?)D(?=\s|$)/i.exec(material.name || '');
 return match&&Number(match[1])>0?Number(match[1]):null;
}
function validLayerDensity(value:unknown){return (typeof value==='string'||typeof value==='number')&&String(value).trim()!==''&&Number.isFinite(Number(value))&&Number(value)>0;}
export function usesDensityLayer(material:{name?:string;density?:unknown;unit?:string}):boolean {
 return ['kg','kgs','kilogram','kilograms','kilogramme','kilogrammes'].includes((material.unit || '').trim().toLowerCase().replace(/\./g,''))&&materialDensity(material)!==null;
}
export function layerOverrides(values:Record<string,string>):Record<string,number>|null {
 if(Object.values(values).some(value=>!validLayerMm(value)))return null;
 return Object.fromEntries(Object.entries(values).map(([id,value])=>[id,Number(value)]));
}
export function mergeLayerQuantities(current:Record<string,string>,previous:Record<string,number>,lines:{material_id:string;layer_mm?:number|null;quantity_per_unit:number}[]):Record<string,string>{
 const next={...current};
 for(const line of lines)if(line.layer_mm!=null&&Number(previous[line.material_id])!==Number(line.layer_mm))next[line.material_id]=String(line.quantity_per_unit);
 return next;
}
