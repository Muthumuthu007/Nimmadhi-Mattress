import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
const source=fs.readFileSync(new URL('./productListing.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
const {productPath,productListTree}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const sections=[{groupId:'m',groupName:'Mattress',groupKind:'MAIN'},{groupId:'a',groupName:'Accessories',groupKind:'MAIN'},{groupId:'f',groupName:'Foam',parentId:'m',products:[]},{groupId:'mf',groupName:'Premium',parentId:'f',products:[{id:'BED'}]},{groupId:'ap',groupName:'Premium',parentId:'a',products:[{id:'PILLOW'}]}];
test('nested groups and custom products resolve by saved IDs rather than their names',()=>{
 assert.deepEqual(productPath({product_id:'BED',product_name:'Misleading pillow'},sections).map(p=>p.id),['m','f','mf']);
 assert.deepEqual(productPath({product_id:'custom-history',source_product_id:'BED'},sections).map(p=>p.id),['m','f','mf']);
 assert.equal(productPath({product_id:'missing',product_name:'Mattress Foam'},sections)[0].name,'Needs classification');
});
test('equal names, variants, original indexes and quantities remain independent',()=>{
 const rows=[{product_id:'PILLOW',quantity:2},{product_id:'BED',quantity:1,size:'72x36x6'},{product_id:'BED',quantity:3,size:'75x36x6'}];
 const before=structuredClone(rows),tree=productListTree(rows,row=>productPath(row,sections));
 assert.deepEqual(tree.map(n=>n.id),['m','a']);assert.equal(tree[0].count,2);assert.equal(tree[1].count,1);
 const entries=[];const visit=n=>{entries.push(...n.items);n.children.forEach(visit);};tree.forEach(visit);
 assert.deepEqual(entries.map(e=>e.index),[1,2,0]);assert.equal(entries.reduce((n,e)=>n+e.item.quantity,0),6);assert.deepEqual(rows,before);
});
test('historical paths stay visible and orphan or cyclic groups cannot loop',()=>{
 assert.deepEqual(productPath({production_group_path:[{group_id:'OLD',name:'Saved group'}]},sections),[{id:'OLD',name:'Saved group'}]);
 const cyclic=[{groupId:'x',groupName:'X',parentId:'y'},{groupId:'y',groupName:'Y',parentId:'x'}];
 const path=productPath({group_id:'x'},cyclic);assert.equal(path[0].name,'Needs classification');assert.equal(path.length,3);
});
