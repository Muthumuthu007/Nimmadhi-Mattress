import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
const source=fs.readFileSync(new URL('./dispatchGroups.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const {groupDispatchRows}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('identically named groups remain separate by durable group IDs',()=>{
 const rows=[{production_group_path:[{group_id:'a',name:'Foam'}],product_name:'Custom bed'},{production_group_path:[{group_id:'b',name:'Foam'}],product_name:'Custom bed'},{product_name:'Unmapped'}];
 const groups=groupDispatchRows(rows);assert.equal(groups.length,3);assert.equal(groups.at(-1).title,'Ungrouped / product no longer mapped');assert.deepEqual(groups.flatMap(group=>group.rows),rows);
});
test('full parent hierarchy is visible and ordering within each group is preserved',()=>{
 const path=[{group_id:'m',name:'Mattress'},{group_id:'f',name:'Foam'}];
 const rows=[{production_group_path:path,push_id:'new',quantity_produced:10},{production_group_path:path,push_id:'old',quantity_produced:2}];
 const groups=groupDispatchRows(rows);assert.equal(groups[0].title,'Mattress → Foam');assert.deepEqual(groups[0].rows.map(row=>row.push_id),['new','old']);
});
