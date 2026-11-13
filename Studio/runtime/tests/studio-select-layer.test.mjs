import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {signatures,patchStudioSelectLayer} from '../scripts/patch-studio-select-layer.mjs';
function fixture(t,version='0.8.77'){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'torq-select-test-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({version}));
 for(const [file,before] of signatures){fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),before);}
 return root;
}
test('patches both JS artifacts once using native menu layer',t=>{
 const root=fixture(t);assert.equal(patchStudioSelectLayer(root).filter(x=>x.changed).length,2);
 for(const [file,,after] of signatures)assert.equal(fs.readFileSync(path.join(root,file),'utf8'),after);
 assert.equal(patchStudioSelectLayer(root).filter(x=>x.changed).length,0);
});
test('version mismatch and corrupt second target leave both targets untouched',t=>{
 assert.throws(()=>patchStudioSelectLayer(fixture(t,'0.8.78')));
 const root=fixture(t);fs.writeFileSync(path.join(root,signatures[1][0]),'unknown');
 assert.throws(()=>patchStudioSelectLayer(root));assert.equal(fs.readFileSync(path.join(root,signatures[0][0]),'utf8'),signatures[0][1]);
});
test('installed native stylesheet defines shared menu layer',()=>{
 const root=new URL('../node_modules/hyperframes/dist/studio/assets/',import.meta.url);
 const css=fs.readdirSync(root).filter(x=>x.endsWith('.css')).map(x=>fs.readFileSync(new URL(x,root),'utf8')).join('\n');
 assert.match(css,/\.z-200\s*\{\s*z-index:\s*200\s*\}/);
});
