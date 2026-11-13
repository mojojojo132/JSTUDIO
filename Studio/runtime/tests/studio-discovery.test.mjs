import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { patchStudioDiscovery, originalPrefix, patchedPrefix } from '../scripts/patch-studio-discovery.mjs';
function fixture(t, version='0.8.77', source=originalPrefix) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'torq-discovery-test-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'dist'));
  fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({version}));
  fs.writeFileSync(path.join(root,'dist/cli.js'),source);
  return root;
}
test('applies once and is idempotent',t=>{
  const root=fixture(t);assert.equal(patchStudioDiscovery(root).changed,true);
  assert.equal(fs.readFileSync(path.join(root,'dist/cli.js'),'utf8'),patchedPrefix);
  assert.equal(patchStudioDiscovery(root).changed,false);
});
test('version and signature guards preserve input',t=>{
  for(const [version,source] of [['0.8.78',originalPrefix],['0.8.77',originalPrefix.repeat(2)],['0.8.77','unknown']]){
    const root=fixture(t,version,source);assert.throws(()=>patchStudioDiscovery(root));
    assert.equal(fs.readFileSync(path.join(root,'dist/cli.js'),'utf8'),source);
  }
});
const native=fs.readFileSync(new URL('../node_modules/hyperframes/dist/cli.js',import.meta.url),'utf8');
test('actual native discovery hides work copies and keeps authored renders HTML',t=>{
  const root=fixture(t),start=native.indexOf('function shouldIgnoreDir(rel)'),end=native.indexOf('function replaceFileAtomically(',start);assert.ok(start>=0&&end>start);
  const ctx={readdirSync17:fs.readdirSync,join40:path.join,IGNORE_DIRS:new Set(['.thumbnails','.transcode-cache','.waveform-cache','node_modules','.git'])};
  vm.createContext(ctx);vm.runInContext(native.slice(start,end),ctx);
  for(const f of ['index.html','compositions/scene.html','renders/authored.html','renders/.hf-render-work-job-123/compiled/index.html']){
    const dest=path.join(root,f);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,'<div data-composition-id="test"></div>');
  }
  const found=Array.from(ctx.walkDir(root)).filter(f=>f.endsWith('.html')&&!ctx.isInHiddenOrVendorDir(f));
  assert.deepEqual(found.sort(),['compositions/scene.html','index.html','renders/authored.html']);
});
test('actual work-prefix function preserves Windows and temp cleanup',t=>{
  const source=native.replace(originalPrefix,patchedPrefix),start=source.indexOf('function resolveRenderWorkDirPrefix('),end=source.indexOf('function isTransientCaptureRetryEligible(',start);assert.ok(start>=0&&end>start);
  const ctx={join74:path.join,dirname30:path.dirname,process,tmpdir9:os.tmpdir};vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
  const root=fixture(t),prefix=ctx.resolveRenderWorkDirPrefix(path.join(root,'video.mp4'),'job','darwin');assert.equal(prefix,path.join(root,'.hf-render-work-job-'));
  const work=fs.mkdtempSync(prefix);fs.mkdirSync(path.join(work,'compiled'));fs.rmSync(work,{recursive:true,force:true});assert.equal(fs.existsSync(work),false);
  assert.equal(ctx.resolveRenderWorkDirPrefix('/output/video.mp4','job','win32','/tmp'),'/tmp/hf-render-');
});
