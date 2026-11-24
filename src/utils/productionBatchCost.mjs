// Same convention as production/push: materials and wastage per unit;
// saved labour, transport and other charges applied once to this batch.
export function productionBatchCost(product, quantity) {
 const count=Number(quantity);
 if(!product || !Number.isSafeInteger(count) || count<1)return null;
 const material=Number(product.productionCostTotal || 0);
 const wastage=material*Number(product.wastage || 0)/100;
 const overhead=Number(product.laborCost || 0)+Number(product.transportCost || 0)+Number(product.otherCost || 0);
 if(![material,wastage,overhead].every(Number.isFinite))return null;
 const total=(material+wastage)*count+overhead;
 return {materialTotal:material*count,wastageTotal:wastage*count,overhead,total,perUnit:total/count};
}
