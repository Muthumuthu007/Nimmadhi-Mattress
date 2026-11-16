import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('./materialLayers.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const {validLayerMm,materialDensity,usesDensityLayer,layerOverrides,mergeLayerQuantities}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('eligible material units and density mirror the KG formula contract',()=>{
 for(const unit of ['KG','kgs','kilograms','K.G.'])assert.equal(usesDensityLayer({name:'45D MEMORY FOAM',unit}),true);
 assert.equal(materialDensity({name:'density not in name',density:'60'}),60);
 assert.equal(materialDensity({name:'45.0D FOAM',density:'NaN'}),45);
 assert.equal(usesDensityLayer({name:'ADHESIVE',unit:'KG'}),false);
 assert.equal(usesDensityLayer({name:'45D FOAM',unit:'PC'}),false);
 assert.equal(materialDensity({name:'FOAM',density:true}),null);
});
test('per-material thicknesses require finite positive millimetres',()=>{
 for(const value of ['',0,-1,1001,'NaN','Infinity',null,true,{}])assert.equal(validLayerMm(value),false);
 assert.equal(validLayerMm('12.5'),true);assert.deepEqual(layerOverrides({a:'25',d:'50'}),{a:25,d:50});assert.equal(layerOverrides({a:''}),null);
});
test('one thickness recalculation preserves manually edited quantities on all other materials',()=>{
 const current={a:'9',b:'1.88',c:'7',d:'1.88',glue:'.15'};
 const result=mergeLayerQuantities(current,{a:25,b:25,c:25,d:25},[{material_id:'a',layer_mm:25,quantity_per_unit:1.88},{material_id:'b',layer_mm:25,quantity_per_unit:1.88},{material_id:'c',layer_mm:25,quantity_per_unit:1.88},{material_id:'d',layer_mm:50,quantity_per_unit:3.7616},{material_id:'glue',layer_mm:null,quantity_per_unit:.1}]);
 assert.deepEqual(result,{...current,d:'3.7616'});assert.equal(current.d,'1.88');
});
test('latest calculation applies multiple pending thickness edits without stale quantities',()=>{
 const result=mergeLayerQuantities({a:'1.88',b:'2',glue:'.15'},{a:25,b:25},[{material_id:'a',layer_mm:50,quantity_per_unit:3.7616},{material_id:'b',layer_mm:12.5,quantity_per_unit:1.25},{material_id:'glue',quantity_per_unit:.1}]);
 assert.deepEqual(result,{a:'3.7616',b:'1.25',glue:'.15'});
});
