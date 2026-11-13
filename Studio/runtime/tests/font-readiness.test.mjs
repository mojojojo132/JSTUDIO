import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {inspectFonts} from '../scripts/font-readiness.mjs';
test('font readiness obeys restricted macOS browser guard before launching',async()=>{await assert.rejects(inspectFonts('/missing',{},{platform:'darwin',env:{CODEX_SANDBOX:'seatbelt'}}),/STUDIO_BROWSER_EXECUTION_REQUIRED/);});
test('font receipts retain exact copy, font hash and failures and close browser',async t=>{const root=await fs.mkdtemp(path.join(os.tmpdir(),'font-ready-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));await fs.writeFile(path.join(root,'font.woff2'),'fixture');let closed=false;const launch=async()=>({newPage:async()=>({setContent:async()=>{},evaluate:async(fn,fonts)=>fonts.map(f=>({family:f.family,weight:f.weight,text:f.text,loaded:true,suspectedFallback:['—']}))}),close:async()=>{closed=true;}});const result=await inspectFonts(root,{fonts:[{path:'font.woff2',family:'Example',weight:700,text:'Exact — copy'}]},{launch,chrome:'/fixture',platform:'linux',env:{}});assert.equal(result.receipt.passed,false);assert.equal(result.receipt.fonts[0].sha256.length,64);assert.equal(result.receipt.fonts[0].text,'Exact — copy');assert.equal(closed,true);});
