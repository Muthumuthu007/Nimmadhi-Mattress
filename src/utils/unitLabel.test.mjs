import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('./unitLabel.ts',import.meta.url),'utf8');
const transpiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const {initialUnitLabel,manufacturingMonthLabel,unitLabelPrintDocument}=await import('data:text/javascript;base64,'+Buffer.from(transpiled).toString('base64'));
test('prefills example product facts without inventing manufacturing date',()=>{
 assert.deepEqual(initialUnitLabel('78X72X6 NIM ANANDHAM FOAM MEMORY',42493),{commodity:'ANANDHAM',quality:'FOAM MEMORY',size:'78 × 72 × 6',manufacturing_month:'',mrp:'42493'});
});
test('decimal and customized sizes are retained and month format matches sample',()=>{
 assert.equal(initialUnitLabel('80.5X31X8 NIM ANANDHAM FOAM MEMORY').size,'80.5 × 31 × 8');assert.equal(manufacturingMonthLabel('2026-09'),'09.2026');
});
test('print document includes full label rather than extracting QR only',()=>{
 const markup='<div class="unit-product-label">ANANDHAM FOAM MEMORY Rs. 42,493.00</div>';
 const html=unitLabelPrintDocument(markup,100,50);assert.ok(html.includes(markup));assert.ok(html.includes('@page{size:100mm 50mm'));assert.ok(html.includes('do not fit this label size'));assert.ok(html.includes('height:50mm'));assert.ok(html.includes('page-break-inside:avoid'));assert.ok(html.includes('class="unit-label-page"'));
});
test('invalid paper sizes are rejected',()=>{
 for(const [w,h] of [[0,50],[100,0],[NaN,50],[201,50],[100,151],[39,80]])assert.throws(()=>unitLabelPrintDocument('label',w,h));
});

test('89 by 45 stock rotates a 45 by 89 value column entirely inside one page',()=>{
 const html=unitLabelPrintDocument('<div class="unit-product-label"></div>',89,45);
 assert.ok(html.includes('@page{size:89mm 45mm;margin:0}'));
 assert.ok(html.includes('width:45mm;height:89mm'));
 assert.ok(html.includes('transform:translateX(89mm) rotate(90deg)'));
 assert.ok(html.includes('transform-origin:top left'));
});
test('portrait stock does not rotate a second time',()=>{
 const html=unitLabelPrintDocument('label',45,89);
 assert.ok(html.includes('width:45mm;height:89mm'));
 assert.ok(!html.includes('rotate(90deg)'));
});

test('rotated layout is contained by a physical page to prevent a second browser sheet',()=>{
 const html=unitLabelPrintDocument('<div class="unit-product-label">values</div>',89,45);
 assert.ok(html.includes('.unit-label-page{position:relative;width:89mm;height:45mm;overflow:hidden;'));
 assert.ok(html.includes('<body><div class="unit-label-page"><div class="unit-product-label">values</div></div>'));
 assert.ok(html.includes('label.scrollHeight>label.clientHeight+2'));
});

test('batch printing contains each unique label once and breaks only between stickers',()=>{
 const labels=['UNIT-ONE','UNIT-TWO','UNIT-THREE'].map(id=>`<div class="unit-product-label">${id}</div>`);
 const html=unitLabelPrintDocument(labels,89,45);
 assert.equal((html.match(/class="unit-label-page"/g)||[]).length,3);
 for(const id of ['UNIT-ONE','UNIT-TWO','UNIT-THREE'])assert.equal(html.split(id).length-1,1);
 assert.ok(html.includes('.unit-label-page:not(:last-child){break-after:page;page-break-after:always}'));
 assert.ok(html.includes('height:auto;'));
 assert.ok(html.includes('labels.length!==3'));
 assert.ok(html.includes('labels.some(label=>'));
});
test('empty or partially missing batches cannot print',()=>{
 assert.throws(()=>unitLabelPrintDocument([],89,45));
 assert.throws(()=>unitLabelPrintDocument(['label',''],89,45));
});
