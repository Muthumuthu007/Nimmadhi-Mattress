import {QRCodeSVG} from 'qrcode.react';
import type {UnitLabelDetails} from '../utils/unitApi';
import {manufacturingMonthLabel} from '../utils/unitLabel';
import './UnitProductLabel.css';
export default function UnitProductLabel({details,unitId}:{details:UnitLabelDetails;unitId:string}){
 const money=Number(details.mrp).toLocaleString('en-US',{useGrouping:false,maximumFractionDigits:2});
 return <div className="unit-product-label"><div className="unit-label-fields">
 <div>{details.commodity}</div>
 <div>{details.quality}</div>
 <div>{details.size.replace(/\s*[xX×]\s*/g,'X')}</div>
 <div className="unit-label-qr"><QRCodeSVG value={JSON.stringify({unit_id:unitId})} size={128} includeMargin bgColor="#ffffff" fgColor="#000000"/></div>
 <div>{manufacturingMonthLabel(details.manufacturing_month)}</div>
 <div>RS.{money}/-</div>
 </div></div>;
}
