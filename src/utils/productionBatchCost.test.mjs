import test from 'node:test';import assert from 'node:assert/strict';import {productionBatchCost} from './productionBatchCost.mjs';
test('production preview matches backend for one, two and ten pieces without repeating batch charges',()=>{
 const product={productionCostTotal:100,wastage:5,laborCost:750,transportCost:1000,otherCost:50};
 for(const n of [1,2,10]){const value=productionBatchCost(product,n);assert.equal(value.total,105*n+1800);assert.equal(value.perUnit,value.total/n);assert.equal(value.overhead,1800);}
});
test('uses updated material cost and wastage; does not modify the recipe',()=>{
 const p={productionCostTotal:200,wastage:10,wastageAmount:1,laborCost:5};const before=structuredClone(p);
 assert.equal(productionBatchCost(p,2).total,445);assert.deepEqual(p,before);
 for(const count of ['',0,-1,1.5,'x'])assert.equal(productionBatchCost(p,count),null);
});
