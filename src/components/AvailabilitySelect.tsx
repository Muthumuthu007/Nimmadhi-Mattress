import {Availability,availabilityLabels} from '../utils/productAvailability';
export default function AvailabilitySelect({value,onChange,inherited,disabled=false}:{value:Availability;onChange:(value:Availability)=>void;inherited?:string;disabled?:boolean}){
 return <label className="block text-sm font-semibold text-gray-800 dark:text-gray-100">Available for<select aria-label="Available for" value={value} disabled={disabled} onChange={e=>onChange(e.target.value as Availability)} className="mt-1 block w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 dark:bg-gray-700 dark:text-white">{Object.entries(availabilityLabels).map(([key,label])=><option key={key} value={key}>{key==='INHERIT'?(inherited?`${label} (${inherited})`:label):label}</option>)}</select></label>;
}
