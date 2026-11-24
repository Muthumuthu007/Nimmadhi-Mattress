import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';import {build} from 'esbuild';
const source=fs.readFileSync('./src/pages/Costing.tsx','utf8')+'\nexport {CostingCard};';
const built=await build({stdin:{contents:source,resolveDir:process.cwd()+'/src/pages',loader:'tsx'},bundle:true,platform:'node',format:'cjs',packages:'external',write:false,jsx:'automatic',define:{'import.meta.env.DEV':'false','import.meta.env.VITE_API_BASE_URL':'"http://127.0.0.1/qa-no-network"'}});
const compiled={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(createRequire(import.meta.url),compiled,compiled.exports);
const React=createRequire(import.meta.url)('react');const {renderToStaticMarkup}=createRequire(import.meta.url)('react-dom/server');
const row={product_id:'p',product_name:'Pillow',created_at:'2026-11-24T10:00:00Z',stock_needed:{m:'2'},production_cost_breakdown:{m:'200'},production_cost_total:200,total_cost:200,wastage_percent:0,wastage_amount:0};
const render=product=>renderToStaticMarkup(React.createElement(compiled.exports.CostingCard,{product,materials:[{id:'m',name:'Foam',unit:'KG'}],onMove:()=>{},onEdit:()=>{},onDelete:()=>{}}));
test('drafts identify current rates and production history identifies saved costs',()=>{
 const draft=render(row);assert.ok(draft.includes('Current material rates'));assert.ok(draft.includes('This estimate uses current material rates'));assert.ok(draft.includes('₹100'));
 const saved=render({...row,is_custom_production_record:true,production_status:'ACTIVE',quantity_produced:1});assert.ok(saved.includes('Saved calculation'));assert.ok(saved.includes('Rates shown are those used in this saved production'));assert.ok(saved.includes('Already pushed to production'));
});
test('missing required materials show an incomplete estimate instead of a complete total',()=>{
 const html=render({...row,cost_missing_material_ids:['missing']});assert.ok(html.includes('Estimate incomplete'));assert.ok(html.includes('>Incomplete<'));
});
