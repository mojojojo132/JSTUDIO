import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {updateAnimationEngine} from '../scripts/animation-engine-update.mjs';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function fixture(t) {
 const base=await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()),'engine-update-test-'));t.after(()=>fs.rm(base,{recursive:true,force:true}));
 const old=path.join(base,'project/animation'),next=path.join(base,'payload');
 for(const [root,body] of [[old,'old'],[next,'new']]){
  const files={'app/src/main.ts':body,'app/src/engine/core.ts':body,'app/src/scenes/film.ts':body,'app/projects/film.json':body,'app/package.json':'{}','app/package-lock.json':'{}'};
  if(root===next)files['app/src/engine/helper.ts']='new helper';
  for(const [name,text] of Object.entries(files)){await fs.mkdir(path.dirname(path.join(root,name)),{recursive:true});await fs.writeFile(path.join(root,name),text);}
  const manifest=JSON.stringify(Object.fromEntries(Object.entries(files).map(([n,b])=>[n,hash(b)])),null,2)+'\n';
  await fs.writeFile(path.join(root,'SOURCE-SHA256.json'),manifest);
  if(root===old)await fs.writeFile(path.join(root,'ANIMATION-WORKSPACE.json'),JSON.stringify({name:'fixture',sourceManifestSha256:hash(manifest)}));
 }
 return {old,next,base};
}
test('plan is read-only; apply changes core, backs up, preserves authoring, repeat is no-op',async t=>{
 const {old,next,base}=await fixture(t);const plan=await updateAnimationEngine(old,next);
 assert.equal(plan.applied,false);assert.equal(plan.changes.length,3);assert.equal(await fs.readFile(path.join(old,'app/src/main.ts'),'utf8'),'old');
 await assert.rejects(fs.access(path.join(base,'project/evidence')));
 const result=await updateAnimationEngine(old,next,{apply:true});assert.equal(result.applied,true);
 assert.equal(await fs.readFile(path.join(old,'app/src/main.ts'),'utf8'),'new');
 assert.equal(await fs.readFile(path.join(old,'app/src/scenes/film.ts'),'utf8'),'old');
 assert.equal(await fs.readFile(path.join(old,'app/projects/film.json'),'utf8'),'old');
 assert.equal(await fs.readFile(path.join(result.backup,'before/app/src/main.ts'),'utf8'),'old');
 assert.equal((await updateAnimationEngine(old,next,{apply:true})).changes.length,0);
});
test('edited or missing old managed core refuses apply without overwriting',async t=>{
 const {old,next}=await fixture(t);await fs.writeFile(path.join(old,'app/src/main.ts'),'authored');await fs.unlink(path.join(old,'app/src/engine/core.ts'));
 const plan=await updateAnimationEngine(old,next);assert.equal(plan.conflicts.length,2);
 await assert.rejects(updateAnimationEngine(old,next,{apply:true}),/conflicts/);
 assert.equal(await fs.readFile(path.join(old,'app/src/main.ts'),'utf8'),'authored');
});
test('new managed path collision refuses apply',async t=>{
 const {old,next}=await fixture(t);await fs.writeFile(path.join(old,'app/src/engine/helper.ts'),'authored');
 await assert.rejects(updateAnimationEngine(old,next,{apply:true}),/conflicts/);
});
test('dependency changes, baseline marker drift and symlinks fail closed',async t=>{
 const {old,next}=await fixture(t);await fs.writeFile(path.join(next,'app/package.json'),'changed');
 await assert.rejects(updateAnimationEngine(old,next),/Dependency/);await fs.writeFile(path.join(next,'app/package.json'),'{}');
 const marker=await fs.readFile(path.join(old,'ANIMATION-WORKSPACE.json'));
 await fs.writeFile(path.join(old,'ANIMATION-WORKSPACE.json'),'{}');await assert.rejects(updateAnimationEngine(old,next),/baseline identity/);await fs.writeFile(path.join(old,'ANIMATION-WORKSPACE.json'),marker);
 await fs.unlink(path.join(old,'app/src/engine/core.ts'));await fs.symlink(path.join(next,'app/src/engine/core.ts'),path.join(old,'app/src/engine/core.ts'));
 await assert.rejects(updateAnimationEngine(old,next),/Unsafe engine file/);
});
