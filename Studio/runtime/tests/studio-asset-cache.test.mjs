import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { patchStudioAssetCache,verifyStudioAssetCache,studioJsFiles } from '../scripts/patch-studio-asset-cache.mjs';
test('versions complete circular module graph together and stays idempotent',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'torq-asset-test-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const assets=path.join(root,'dist/studio/assets');fs.mkdirSync(assets,{recursive:true});
 fs.writeFileSync(path.join(root,'package.json'),'{"version":"0.8.77"}');
 const html=path.join(root,'dist/studio/index.html');fs.writeFileSync(html,'<script src="/assets/index-2GgHjQq-.js?torq-select-layer=1"></script>');
 for(const f of studioJsFiles)fs.copyFileSync(new URL('../node_modules/hyperframes/dist/studio/assets/'+f,import.meta.url),path.join(assets,f));
 const originalHtml=fs.readFileSync(html,'utf8');
 fs.writeFileSync(html,'<script src="/unexpected.js"></script>');
 assert.throws(()=>patchStudioAssetCache(root));
 assert.deepEqual(fs.readdirSync(assets).sort(),[...studioJsFiles].sort());
 assert.equal(fs.readFileSync(html,'utf8'),'<script src="/unexpected.js"></script>');
 fs.writeFileSync(html,originalHtml);
 const first=patchStudioAssetCache(root);assert.equal(first.changed,true);
 const markup=fs.readFileSync(html,'utf8');assert.ok(markup.includes('/assets/'+first.directory+'/index-2GgHjQq-.js'));assert.ok(!markup.includes('?'));
 for(const file of studioJsFiles){
  const copy=fs.readFileSync(path.join(assets,first.directory,file));
  assert.ok(!copy.toString().includes('import.meta.url'),'No asset URL tied to relocated module URL');assert.ok(copy.equals(fs.readFileSync(path.join(assets,file))));
  // Literal relative imports, including chunk-to-entry cycles, all stay in this graph.
  for(const match of copy.toString().matchAll(/(?:from|import\()"\.\/([^"/]+\.js)"/g))assert.ok(studioJsFiles.includes(match[1]),match[1]);
 }
 assert.equal(patchStudioAssetCache(root).changed,false);assert.equal(verifyStudioAssetCache(root).verified,true);
 const cached=path.join(assets,first.directory,'index-2GgHjQq-.js');fs.appendFileSync(cached,'stale');assert.throws(()=>verifyStudioAssetCache(root),/differs/);patchStudioAssetCache(root);assert.equal(verifyStudioAssetCache(root).verified,true);
 fs.appendFileSync(path.join(assets,'index-BX3KHhGX.js'),'\n// changed');
 assert.throws(()=>verifyStudioAssetCache(root),/stale/);assert.notEqual(patchStudioAssetCache(root).directory,first.directory);assert.equal(verifyStudioAssetCache(root).verified,true);
});
