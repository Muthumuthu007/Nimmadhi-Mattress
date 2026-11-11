import {isMemoryFoam,memoryFoamInches} from '../utils/memoryFoamThickness';
export default function ProductionMaterialQuantity({productName,materialName,quantity,unit,productCount=1}:{productName:string;materialName:string;quantity:number;unit?:string;productCount?:number}){
 const inches=memoryFoamInches(productName,materialName,quantity,unit);
 return <span className="inline-flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5">
  <span className="whitespace-nowrap">{(Number(quantity)*productCount).toLocaleString('en-IN',{maximumFractionDigits:6})} {unit || 'unit not recorded'}</span>
  {isMemoryFoam(materialName)&&(inches===null?<span className="text-xs text-gray-500 dark:text-gray-400">Inches unavailable</span>:<span className="whitespace-nowrap text-indigo-700 dark:text-indigo-200" title="Equivalent layer thickness from saved kg, product length and width, density, and the 25 mm-per-inch Casting rule. Display only; deductions remain in kg.">≈ {inches.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})} in{productCount!==1?' per mattress':' layer'}</span>)}
 </span>;
}
