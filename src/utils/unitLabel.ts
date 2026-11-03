import type {UnitLabelDetails} from './unitApi';
export function initialUnitLabel(productName:string,mrp?:number|null):UnitLabelDetails{
 const dimension=productName.match(/^\s*(\d+(?:\.\d+)?\s*[xX×]\s*\d+(?:\.\d+)?(?:\s*[xX×]\s*\d+(?:\.\d+)?)?)/);
 const model=productName.slice(dimension?.[0].length || 0).trim().replace(/^NIM\s+/i,'');
 const [commodity,...quality]=model.split(/\s+/);
 return {commodity:commodity || '',quality:quality.join(' '),size:dimension?dimension[1].replace(/\s/g,'').replace(/[x×]/gi,' × '):'',manufacturing_month:'',mrp:mrp==null?'':String(mrp)};
}
export function manufacturingMonthLabel(value:string){const match=/^(\d{4})-(\d{2})$/.exec(value);return match?`${match[2]}.${match[1]}`:'Not entered';}
export function unitLabelPrintDocument(markup:string,width:number,height:number){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<40||width>200||height<60||height>200)throw new Error('Use label width 40–200 mm and height 60–200 mm.');
 return `<!doctype html><html><head><meta charset="utf-8"><title>Nimmadhi product label</title><style>
 @page{size:${width}mm ${height}mm;margin:0}html,body{margin:0;padding:0;background:#fff;color:#000;width:${width}mm;font-family:Arial,sans-serif}
 .unit-product-label{box-sizing:border-box;width:${width}mm;min-height:${height}mm;padding:${height<90?'2':'3'}mm;background:#fff!important;color:#000!important;font-size:${width<60?'7.5':'9'}pt;font-weight:700;line-height:1.2;break-inside:avoid}
 .unit-label-brand{font-size:${width<60?'10':'12'}pt;font-weight:900;border-bottom:.3mm solid #000;padding-bottom:${height<90?'1':'2'}mm;margin-bottom:${height<90?'1':'2'}mm;text-align:center}
 .unit-label-fields{display:grid;gap:${height<90?'1':'1.5'}mm;margin:0}.unit-label-row{display:grid;grid-template-columns:45% minmax(0,1fr);gap:2mm;align-items:center}.unit-label-row dt,.unit-label-row dd{margin:0;overflow-wrap:anywhere;color:#000!important}.unit-label-row dt{font-size:.9em}.unit-label-row dd{font-weight:800}
 .unit-label-qr svg{display:block;width:${height<90?(width<60?'18':'22'):(width<60?'20':'24')}mm;height:${height<90?(width<60?'18':'22'):(width<60?'20':'24')}mm}.unit-label-id{font:6pt monospace;overflow-wrap:anywhere;margin-top:1mm}.unit-label-footer{text-align:center;border-top:.2mm solid #000;margin-top:${height<90?'1':'2'}mm;padding-top:${height<90?'1':'1.5'}mm;font-size:7pt}
 </style></head><body>${markup}<script>window.addEventListener('load',()=>{setTimeout(()=>{const label=document.querySelector('.unit-product-label');if(label&&label.getBoundingClientRect().height>${height}*96/25.4+2){const note=document.createElement('p');note.textContent='These details do not fit this label size. Increase the label height or width and print again.';note.style.cssText='color:#b00020;font:14px Arial;padding:12px';document.body.prepend(note);return;}window.focus();window.print()},100)});window.addEventListener('afterprint',()=>window.close());</script></body></html>`;
}
