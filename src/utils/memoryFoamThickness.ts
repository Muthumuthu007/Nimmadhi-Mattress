/** Display-only inverse of the approved Casting memory-layer formula. */
export function isMemoryFoam(name:string){return /MEMORY/i.test(name)&&/FOAM/i.test(name);}
export function memoryFoamInches(productName:string,materialName:string,quantity:unknown,unit?:string):number|null{
 if(!isMemoryFoam(materialName)||!['KG','KGS','KILOGRAM','KILOGRAMS'].includes((unit || '').trim().toUpperCase()))return null;
 const dimensions=productName.match(/(?:^|[^\d.])(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)(?![\d.])/);
 const density=materialName.match(/\b(\d+)\s*D\b/i);
 if(!dimensions||!density||quantity===null||quantity===undefined||String(quantity).trim()==='')return null;
 const length=Number(dimensions[1]),width=Number(dimensions[2]),d=Number(density[1]),kg=Number(quantity);
 if(![length,width,d,kg].every(Number.isFinite)||length<=0||width<=0||d<=0||kg<0)return null;
 // Factory convention: one inch of memory layer = 25 mm, not 25.4 mm.
 const inches=kg/(length*width*d*0.000000645*25);
 return Number.isFinite(inches)?inches:null;
}
