import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
const source=fs.readFileSync(new URL('./memoryFoamThickness.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-10);
const {memoryFoamInches}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('saved kg derives equivalent layer using selected density and area',()=>{
 near(memoryFoamInches('72X36X6 BED','45D MEMORY FOAM',1.88082,'KG'),1);
 near(memoryFoamInches('72X38X8 BED','45D MEMORY FOAM',1.98531,'KG'),1);
 near(memoryFoamInches('72X36X8 BED','40D MEMORY FOAM',1.67184,'kg'),1);
 assert.ok(Math.abs(memoryFoamInches('72X36X6 BED','45D MEMORY FOAM',1.88,'KG')-1)<.001);
});
test('shows actual saved layer instead of always returning one inch',()=>{
 near(memoryFoamInches('72X36X8 BED','45D MEMORY FOAM',3.76164,'KG'),2);
 assert.equal(memoryFoamInches('72X36X8 BED','45D MEMORY FOAM',0,'KG'),0);
});
test('rejects unknown units, missing dimensions or density and invalid quantities',()=>{
 for(const [product,material,quantity,unit] of [['BED','45D MEMORY FOAM',1.88,'KG'],['72X36X6 BED','MEMORY FOAM',1.88,'KG'],['72X36X6 BED','45D MEMORY FOAM',1.88,'PC'],['72X36X6 BED','45D PU FOAM',1.88,'KG'],['72X36X6 BED','45D MEMORY FOAM',-1,'KG'],['72X36X6 BED','45D MEMORY FOAM','NaN','KG'],['72X36X6 BED','45D MEMORY FOAM',null,'KG']])assert.equal(memoryFoamInches(product,material,quantity,unit),null);
});
test('decimal dimensions and multiplication signs are supported',()=>{
 const kg=75.5*56*45*0.000000645*25;
 assert.ok(Math.abs(memoryFoamInches('75.5 × 56 × 4 BED','45D MEMORY FOAM',kg,'KG')-1)<1e-10);
});
