import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
const source=fs.readFileSync(new URL('./permissionUtils.ts',import.meta.url),'utf8');const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;const {getFirstAllowedRoute,PERMISSION_ROUTES}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('users with no assigned production module can reach authenticated QR reprinting',()=>{
 assert.equal(getFirstAllowedRoute([],false),'/dashboard/qr-reprints');assert.equal(getFirstAllowedRoute(['unrecognised'],false),'/dashboard/qr-reprints');
 assert.equal(getFirstAllowedRoute(['reports'],false),'/dashboard/reports');assert.equal(getFirstAllowedRoute(['production'],false),'/dashboard/production');assert.equal(getFirstAllowedRoute([],true),'/admin');
 assert.equal(PERMISSION_ROUTES.production,'/dashboard/production');
});
