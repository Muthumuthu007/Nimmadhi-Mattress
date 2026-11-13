import type {UnitLabelDetails} from './unitApi';
export function initialUnitLabel(productName:string,mrp?:number|null):UnitLabelDetails{
 const dimension=productName.match(/^\s*(\d+(?:\.\d+)?\s*[xX×]\s*\d+(?:\.\d+)?(?:\s*[xX×]\s*\d+(?:\.\d+)?)?)/);
 const model=productName.slice(dimension?.[0].length || 0).trim().replace(/^NIM\s+/i,'');
 const [commodity,...quality]=model.split(/\s+/);
 return {commodity:commodity || '',quality:quality.join(' '),size:dimension?dimension[1].replace(/\s/g,'').replace(/[x×]/gi,' × '):'',manufacturing_month:'',mrp:mrp==null?'':String(mrp)};
}
export function manufacturingMonthLabel(value:string){const match=/^(\d{4})-(\d{2})$/.exec(value);return match?`${match[2]}.${match[1]}`:'Not entered';}
// Flatten each complete sticker before pagination. Rotated HTML descendants can
// be fragmented against the paper height on later pages by browser print engines.
export async function prepareLabelPrintPages(doc:Document,width:number,height:number,rotated:boolean,expected:number){
 const labels=Array.from(doc.querySelectorAll<HTMLElement>('.unit-product-label'));
 const fail=()=>{throw new Error('These details do not fit this label size, or a QR label is incomplete. Increase the sticker width or height, or prepare the batch again. Nothing has been printed.');};
 if(labels.length!==expected)fail();
 await doc.fonts.ready;
 const images:HTMLImageElement[]=[];
 for(const label of labels){
  const fields=label.querySelector<HTMLElement>('.unit-label-fields');
  if(!fields || fields.children.length!==6 || !fields.querySelector('.unit-label-qr svg'))fail();
  if(label.scrollHeight>label.clientHeight+2 || label.scrollWidth>label.clientWidth+2 || fields!.scrollHeight>fields!.clientHeight+2)fail();
  // Measure unrotated content in CSS pixels; rotation happens only on the bitmap.
  const transform=label.style.transform;label.style.transform='none';
  try{
   const bounds=label.getBoundingClientRect();
   const canvas=doc.createElement('canvas');
   const dpi=300,pxPerMm=96/25.4;
   canvas.width=Math.round(width/25.4*dpi);canvas.height=Math.round(height/25.4*dpi);
   const context=canvas.getContext('2d');if(!context)fail();
   const ctx=context!;
   ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.scale(canvas.width/(width*pxPerMm),canvas.height/(height*pxPerMm));
   if(rotated){ctx.translate(width*pxPerMm,0);ctx.rotate(Math.PI/2);}
   for(const field of Array.from(fields!.children) as HTMLElement[]){
    const qr=field.querySelector('svg');
    if(qr){
     const rect=qr.getBoundingClientRect();
     const copy=qr.cloneNode(true) as SVGElement;copy.setAttribute('xmlns','http://www.w3.org/2000/svg');copy.setAttribute('width',String(Math.round(rect.width*dpi/96)));copy.setAttribute('height',String(Math.round(rect.height*dpi/96)));
     const image=new Image();
     await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('A QR image could not be prepared. Nothing has been printed.'));image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(copy));});
     ctx.drawImage(image,rect.left-bounds.left,rect.top-bounds.top,rect.width,rect.height);
    }else{
     const style=doc.defaultView!.getComputedStyle(field);
     ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
     ctx.fillStyle='#000';ctx.strokeStyle='#000';ctx.lineWidth=.2;ctx.lineJoin='round';ctx.textBaseline='alphabetic';
     // Browser ranges retain actual line wrapping, including React text nodes.
     const lines:{top:number;left:number;text:string}[]=[];
     const walker=doc.createTreeWalker(field,NodeFilter.SHOW_TEXT);
     let node:Node|null;
     while((node=walker.nextNode())){
      const text=node.textContent || '';
      for(let i=0;i<text.length;i++){
       const range=doc.createRange();range.setStart(node,i);range.setEnd(node,i+1);
       const rect=range.getBoundingClientRect();
       if(!rect.width && !rect.height)continue;
       let line=lines.find(line=>Math.abs(line.top-rect.top)<1);
       if(!line){line={top:rect.top,left:rect.left,text:''};lines.push(line);}
       line.text+=text[i];
      }
     }
     const metrics=ctx.measureText('Mg');
     const ascent=metrics.fontBoundingBoxAscent || Number.parseFloat(style.fontSize)*.9;
     for(const line of lines){const x=line.left-bounds.left,y=line.top-bounds.top+ascent;ctx.fillText(line.text,x,y);ctx.strokeText(line.text,x,y);}
    }
   }
   const pageImage=doc.createElement('img');pageImage.className='unit-label-print-image';pageImage.alt='Complete product label with QR code';pageImage.width=canvas.width;pageImage.height=canvas.height;
   await new Promise<void>((resolve,reject)=>{pageImage.onload=()=>resolve();pageImage.onerror=()=>reject(new Error('A sticker could not be prepared. Nothing has been printed.'));pageImage.src=canvas.toDataURL('image/png');});
   images.push(pageImage);
  }finally{label.style.transform=transform;}
 }
 // Commit the entire batch only once all images and all fit checks succeeded.
 labels.forEach((label,index)=>label.replaceWith(images[index]));
}
export function unitLabelPrintDocument(markup:string|string[],width:number,height:number){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<40||width>200||height<35||height>150)throw new Error('Use a sticker width of 40–200 mm and height of 35–150 mm.');
 const labels=Array.isArray(markup)?markup:[markup];
 if(!labels.length || labels.some(label=>!label.trim()))throw new Error('All QR labels must be ready before printing.');
 const pages=labels.map(label=>`<div class="unit-label-page">${label}</div>`).join('');
 const rotated=width>height;
 const contentWidth=rotated?height:width,contentHeight=rotated?width:height;
 const compact=contentHeight<60;
 const portrait=contentHeight>contentWidth;
 return `<!doctype html><html><head><meta charset="utf-8"><title>Nimmadhi product label</title><style>
 @page{size:${width}mm ${height}mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#000;width:${width}mm;${labels.length>1?'height:auto;':`height:${height}mm;`}position:relative;font-family:"Arial Black",Arial,sans-serif}
 .unit-label-page{position:relative;width:${width}mm;height:${height}mm;overflow:hidden;break-inside:avoid;page-break-inside:avoid}
 .unit-label-page:not(:last-child){break-after:page;page-break-after:always}
 .unit-product-label{position:absolute;left:0;top:0;width:${contentWidth}mm;height:${contentHeight}mm;${rotated?`transform-origin:top left;transform:translateX(${width}mm) rotate(90deg);`:""}padding:3mm 3mm ${compact?'4':'8'}mm;background:#fff!important;color:#000!important;font-size:${compact?'7':portrait?'14':'10'}pt;font-weight:900;line-height:1.35;display:flex;align-items:center;break-inside:avoid;page-break-inside:avoid}
 .unit-label-fields{display:flex;flex-direction:column;justify-content:space-between;gap:${compact?'.5':'2'}mm;margin:0;width:100%;height:100%;min-height:0;overflow-wrap:anywhere;font-weight:900}.unit-label-fields>div:not(.unit-label-qr){-webkit-text-stroke:.2px currentColor}.unit-label-qr svg{display:block;width:${compact?'12':portrait?'14':'14'}mm;height:${compact?'12':portrait?'14':'14'}mm}
 .unit-label-print-image{display:block;width:${width}mm;height:${height}mm;max-width:none;max-height:none}\n .label-fit-error{display:none}
 </style></head><body>${pages}<script>window.addEventListener('load',async()=>{try{await (${prepareLabelPrintPages.toString()})(document,${width},${height},${rotated},${labels.length});await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));window.focus();window.print();}catch(error){const note=document.createElement('p');note.setAttribute('role','alert');note.textContent=error instanceof Error?error.message:'The labels could not be prepared. Nothing has been printed.';note.style.cssText='color:#b00020;font:14px Arial;padding:12px';document.body.prepend(note);}});window.addEventListener('afterprint',()=>window.close());</script></body></html>`;
}
