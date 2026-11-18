import {QRCodeSVG} from 'qrcode.react';
import type {UnitLabelDetails} from '../utils/unitApi';
import {manufacturingMonthLabel} from '../utils/unitLabel';

// One vector image per physical sticker: pagination cannot split its fields.
export default function UnitPrintLabel({details,unitId,width=89,height=45}:{details:UnitLabelDetails;unitId:string;width?:number;height?:number}){
 const rotated=width>height,contentWidth=rotated?height:width,contentHeight=rotated?width:height;
 const compact=contentHeight<60,portrait=contentHeight>contentWidth,fontMm=(compact?7:portrait?14:10)*25.4/72;
 const money=Number(details.mrp).toLocaleString('en-US',{useGrouping:false,maximumFractionDigits:2});
 const fields=[details.commodity,details.quality,details.size.replace(/\s*[xX×]\s*/g,'X'),null,manufacturingMonthLabel(details.manufacturing_month),`RS.${money}/-`];
 return <svg xmlns="http://www.w3.org/2000/svg" className="unit-print-label" data-unit-id={unitId} data-content-width={contentWidth} data-content-height={contentHeight} data-font-mm={fontMm} data-bottom-mm={compact?4:8} data-qr-mm={compact?12:14} width={`${width}mm`} height={`${height}mm`} viewBox={`0 0 ${width} ${height}`}>
  <title>{unitId}</title><rect width={width} height={height} fill="#fff"/>
  <g transform={rotated?`translate(${width} 0) rotate(90)`:undefined} fill="#000" style={{fontFamily:'"Arial Black",Arial,sans-serif',fontWeight:900,fontSize:fontMm}}>
   {fields.map((value,index)=>value===null?<g key={index} data-print-qr="true" data-print-row={index}><QRCodeSVG value={JSON.stringify({unit_id:unitId})} size={compact?12:14} includeMargin bgColor="#fff" fgColor="#000"/></g>:<text key={index} data-print-field="true" data-print-row={index} x="0" y="0" stroke="#000" strokeWidth="0.05" paintOrder="stroke">{value}</text>)}
  </g>
 </svg>;
}
