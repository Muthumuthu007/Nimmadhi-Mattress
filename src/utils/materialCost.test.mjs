import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('./materialCost.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {materialCostLine}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('fractional quantity shows the saved rate and material amount',()=>{
 assert.deepEqual(materialCostLine('foam','2.5','250',[{id:'foam',name:'Foam',unit:'kg'}]),{name:'Foam',unit:'kg',quantity:2.5,cost:250,rate:100});
});
test('saved costs stay consistent rather than mixing in current purchase rates',()=>{
 assert.equal(materialCostLine('foam',2.5,250,[{id:'foam',name:'Foam',unit:'kg',cost:500}]).rate,100);
 assert.equal(materialCostLine('tape','18.9','42.525',[{id:'tape',name:'Tape',unit:'inch'}]).rate,2.25);
});
test('missing costs and units are not presented as free materials',()=>{
 const line=materialCostLine('unknown',2.5,undefined);
 assert.equal(line.cost,null);assert.equal(line.rate,null);assert.equal(line.unit,null);
 assert.equal(materialCostLine('foam',2.5,0).rate,0);
});
test('ID match wins and duplicate names never silently choose a material',()=>{
 const materials=[{id:'first',name:'Foam',unit:'kg'},{id:'second',name:'Foam',unit:'g'}];
 assert.equal(materialCostLine('second',1,4,materials).unit,'g');
 assert.equal(materialCostLine('Foam',1,4,materials).unit,null);
});
test('zero and invalid quantities do not yield infinite or fabricated rates',()=>{
 for(const qty of [0,'',null,'bad',-1])assert.equal(materialCostLine('foam',qty,250).rate,null);
 for(const cost of [null,'',undefined,'bad',Infinity,-1])assert.equal(materialCostLine('foam',2.5,cost).cost,null);
});
