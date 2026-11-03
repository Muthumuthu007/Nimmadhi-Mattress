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
 const html=unitLabelPrintDocument(markup,100,50);assert.ok(html.includes(markup));assert.ok(html.includes('@page{size:100mm 50mm'));assert.ok(html.includes('do not fit this label size'));assert.ok(html.includes('height:50mm'));assert.ok(html.includes('page-break-inside:avoid'));assert.ok(!html.includes('overflow: hidden'));
});
test('invalid paper sizes are rejected',()=>{
 for(const [w,h] of [[0,50],[100,0],[NaN,50],[201,50],[100,151],[39,80]])assert.throws(()=>unitLabelPrintDocument('label',w,h));
});
