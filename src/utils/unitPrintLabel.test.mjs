import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const result=await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import Label from './src/components/UnitPrintLabel';export const render=(details,id)=>renderToStaticMarkup(React.createElement(Label,{details,unitId:id}));`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic'});
const compiled={exports:{}};
new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),compiled,compiled.exports);
const {render}=compiled.exports;
test('every sticker in a 20-unit batch contains its own complete vector label',()=>{
 const details={commodity:'MAG',quality:'BONNELL',size:'75 × 60 × 6',manufacturing_month:'2026-11',mrp:22000};
 const labels=Array.from({length:20},(_,i)=>render(details,`UNIT-${i}`));
 const codes=new Set();
 labels.forEach((label,i)=>{
  assert.match(label,new RegExp(`data-unit-id="UNIT-${i}"`));
  for(const value of ['MAG','BONNELL','75X60X6','11.2026','RS.22000/-'])assert.ok(label.includes(value));
  assert.equal((label.match(/data-print-row=/g)||[]).length,6);
  assert.match(label,/width="89mm" height="45mm"/);
  assert.match(label,/data-qr-mm="14"/);
  codes.add(label.match(/<path fill="#000" d="([^"]+)"/)?.[1]);
 });
 assert.equal(codes.size,20,'each sticker must carry its own unique QR');
});
