import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync(new URL('./productAvailability.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const {resolveAvailability}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const groups=[{group_id:'main',name:'Mattress',outlet_availability:'NIM'},{group_id:'sub',parent_id:'main',name:'Memory'},{group_id:'child',parent_id:'sub',name:'Child',outlet_availability:'OUT'}];
test('closest group and product overrides win using IDs',()=>{assert.equal(resolveAvailability({group_id:'sub'},groups).value,'NIM');assert.equal(resolveAvailability({group_id:'child'},groups).value,'OUT');assert.equal(resolveAvailability({group_id:'child',outlet_availability:'BOTH'},groups).value,'BOTH');});
test('inheriting and legacy products default safely without name rules',()=>{assert.equal(resolveAvailability({product_name:'NIM bed'},[]).value,'BOTH');assert.equal(resolveAvailability({group_id:'sub',outlet_availability:'INHERIT'},groups).source,'Inherited from Mattress');});
test('cycles terminate',()=>{assert.equal(resolveAvailability({group_id:'a'},[{group_id:'a',parent_id:'b'},{group_id:'b',parent_id:'a'}]).value,'BOTH');});
