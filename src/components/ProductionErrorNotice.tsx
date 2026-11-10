import {useEffect,useId,useRef} from 'react';
import {AlertTriangle} from 'lucide-react';
export default function ProductionErrorNotice({message,onClose,onResolve}:{message:string;onClose:()=>void;onResolve?:()=>void}){
 const title=useId(),description=useId(),panel=useRef<HTMLDivElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;panel.current?.querySelector<HTMLButtonElement>('button')?.focus();return()=>{if(previous?.isConnected)previous.focus();};},[]);
 return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onKeyDown={event=>{
  if(event.key==='Escape'){event.preventDefault();onClose();}
  if(event.key==='Tab'){const buttons=panel.current?.querySelectorAll<HTMLButtonElement>('button');if(!buttons?.length)return;const first=buttons[0],last=buttons[buttons.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
 }}>
  <div ref={panel} role="alertdialog" aria-modal="true" aria-labelledby={title} aria-describedby={description} className="w-full max-w-md rounded-xl border border-red-200 bg-white p-6 text-gray-900 shadow-xl dark:border-red-800 dark:bg-gray-800 dark:text-white">
   <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" aria-hidden="true"/><div><h3 id={title} className="text-lg font-bold">Please check before proceeding</h3><p id={description} className="mt-2 text-sm leading-6">{message}</p></div></div>
   <div className="mt-5 flex flex-wrap justify-end gap-3">{onResolve&&<button type="button" onClick={onResolve} className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white focus:outline-none focus:ring-2 focus:ring-indigo-400">Go to missing step</button>}<button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-gray-600">Close</button></div>
  </div>
 </div>;
}
