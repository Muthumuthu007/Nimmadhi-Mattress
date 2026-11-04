import type {UnitLabelDetails} from './unitApi';
export function initialUnitLabel(productName:string,mrp?:number|null):UnitLabelDetails{
 const dimension=productName.match(/^\s*(\d+(?:\.\d+)?\s*[xX×]\s*\d+(?:\.\d+)?(?:\s*[xX×]\s*\d+(?:\.\d+)?)?)/);
 const model=productName.slice(dimension?.[0].length || 0).trim().replace(/^NIM\s+/i,'');
 const [commodity,...quality]=model.split(/\s+/);
 return {commodity:commodity || '',quality:quality.join(' '),size:dimension?dimension[1].replace(/\s/g,'').replace(/[x×]/gi,' × '):'',manufacturing_month:'',mrp:mrp==null?'':String(mrp)};
}
export function manufacturingMonthLabel(value:string){const match=/^(\d{4})-(\d{2})$/.exec(value);return match?`${match[2]}.${match[1]}`:'Not entered';}
export function unitLabelPrintDocument(markup:string,width:number,height:number){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<40||width>200||height<35||height>150)throw new Error('Use a sticker width of 40–200 mm and height of 35–150 mm.');
 const rotated=width>height;
 const contentWidth=rotated?height:width,contentHeight=rotated?width:height;
 const compact=contentHeight<60;
 const portrait=contentHeight>contentWidth;
 return `<!doctype html><html><head><meta charset="utf-8"><title>Nimmadhi product label</title><style>
 @page{size:${width}mm ${height}mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#000;width:${width}mm;height:${height}mm;position:relative;font-family:"Arial Narrow",Arial,sans-serif}
 .unit-product-label{position:absolute;left:0;top:0;width:${contentWidth}mm;height:${contentHeight}mm;${rotated?`transform-origin:top left;transform:translateX(${width}mm) rotate(90deg);`:""}padding:3mm;background:#fff!important;color:#000!important;font-size:${compact?'7':portrait?'12':'9'}pt;font-weight:700;line-height:1.1;display:flex;align-items:center;break-inside:avoid;page-break-inside:avoid}
 .unit-label-fields{display:flex;flex-direction:column;justify-content:space-between;gap:${compact?'.5':'2'}mm;margin:0;width:100%;height:100%;min-height:0;overflow-wrap:anywhere;font-weight:800}.unit-label-qr svg{display:block;width:${compact?'12':portrait?'14':'14'}mm;height:${compact?'12':portrait?'14':'14'}mm}
 .label-fit-error{display:none}
 </style></head><body>${markup}<script>window.addEventListener('load',()=>{setTimeout(()=>{const label=document.querySelector('.unit-product-label');const content=label?.querySelector('.unit-label-fields');if(!label||label.scrollHeight>label.clientHeight+2||label.scrollWidth>label.clientWidth+2||(content&&content.scrollHeight>content.clientHeight+2)){const note=document.createElement('p');note.textContent='These details do not fit this label size. Increase the sticker width or height. Nothing has been printed.';note.style.cssText='color:#b00020;font:14px Arial;padding:12px';document.body.prepend(note);return;}window.focus();window.print()},100)});window.addEventListener('afterprint',()=>window.close());</script></body></html>`;
}
