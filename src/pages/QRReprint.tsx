import {useState} from 'react';
import QRReprintHistory from '../components/QRReprintHistory';
import {unitApi} from '../utils/unitApi';
const loadHistory=async()=> (await unitApi.reprintHistory()).data;
const loadBatch=async(id:string)=> (await unitApi.reprintBatch(id)).data;

export default function QRReprint(){
 const [open,setOpen]=useState(true);
 return <main className="mx-auto max-w-6xl p-4 sm:p-6"><section className="rounded-xl border border-gray-200 bg-white p-5 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"><h1 className="text-2xl font-bold">Reprint QR</h1><p className="mt-2">Select existing labels from the last three days. Reprinting uses the same QR and does not add stock or create new labels.</p><button type="button" onClick={()=>setOpen(true)} className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">Browse QR reprint history</button></section>{open&&<QRReprintHistory loadHistory={loadHistory} loadBatch={loadBatch} onClose={()=>setOpen(false)}/>}</main>;
}
