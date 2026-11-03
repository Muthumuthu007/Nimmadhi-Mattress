import {QRCodeSVG} from 'qrcode.react';
import type {UnitLabelDetails} from '../utils/unitApi';
import {manufacturingMonthLabel} from '../utils/unitLabel';
import './UnitProductLabel.css';
export default function UnitProductLabel({details,unitId}:{details:UnitLabelDetails;unitId:string}){
 const money=Number(details.mrp).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
 return <div className="unit-product-label"><div className="unit-label-brand">NIMMADHI MATTRESS</div><dl className="unit-label-fields">
 <div className="unit-label-row"><dt>Name of the Commodity</dt><dd>{details.commodity}</dd></div>
 <div className="unit-label-row"><dt>Quality</dt><dd>{details.quality}</dd></div>
 <div className="unit-label-row"><dt>Size in inch</dt><dd>{details.size}</dd></div>
 <div className="unit-label-row"><dt>Product Code</dt><dd><div className="unit-label-qr"><QRCodeSVG value={JSON.stringify({unit_id:unitId})} size={128} includeMargin bgColor="#ffffff" fgColor="#000000"/></div><div className="unit-label-id">{unitId}</div></dd></div>
 <div className="unit-label-row"><dt>Date of Manufacturing</dt><dd>{manufacturingMonthLabel(details.manufacturing_month)}</dd></div>
 <div className="unit-label-row"><dt>Max Retail Price<br/>(Incl. of Taxes)</dt><dd>Rs. {money}/-</dd></div>
 </dl><div className="unit-label-footer">Get Your Sleep</div></div>;
}
