import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {withSetupReadiness,checkSetupProject} from '../scripts/setup-validation.mjs';

async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'jstudio-setup-test-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 for(const dir of ['starter/assets','node_modules/gsap/dist','.runtime'])await fs.mkdir(path.join(root,dir),{recursive:true});
 await fs.writeFile(path.join(root,'starter/index.html'),'<div data-duration="8">Shipped starter</div>');
 await fs.writeFile(path.join(root,'node_modules/gsap/dist/gsap.min.js'),'installed GSAP');
 await fs.writeFile(path.join(root,'.runtime/setup-complete.json'),'old readiness');
 return root;
}
const marker=root=>path.join(root,'.runtime/setup-complete.json');
const setup=(root,work)=>withSetupReadiness(path.join(root,'.runtime'),{platform:'test'},work);
async function check(root,args){
 assert.equal(args[0],'check');assert.equal(args[2],'--strict');
 assert.equal(path.dirname(args[1]),path.join(root,'.runtime'));
 assert.equal(await fs.readFile(path.join(args[1],'index.html'),'utf8'),'<div data-duration="8">Shipped starter</div>');
}
for(const [state,content] of [['valid','<div data-duration="12">User edit</div>'],['invalid','unfinished broken user source']]){
 test(`repair validates isolated starter and preserves ${state} existing project`,async t=>{
  const root=await fixture(t);const project=path.join(root,'projects/my-first-jstudio-video');
  await fs.mkdir(project,{recursive:true});
  await fs.writeFile(path.join(project,'index.html'),content);
  await fs.writeFile(path.join(project,'notes.txt'),'do not change');
  let checked;
  await setup(root,()=>checkSetupProject(root,async args=>{checked=args[1];await check(root,args);}));
  assert.equal(await fs.readFile(path.join(project,'index.html'),'utf8'),content);
  assert.equal(await fs.readFile(path.join(project,'notes.txt'),'utf8'),'do not change');
  assert.deepEqual((await fs.readdir(project)).sort(),['index.html','notes.txt']);
  assert.equal(JSON.parse(await fs.readFile(marker(root),'utf8')).platform,'test');
  await assert.rejects(fs.access(checked),{code:'ENOENT'});
 });
}
test('first setup validates neutral starter without creating production content',async t=>{
 const root=await fixture(t);
 await setup(root,()=>checkSetupProject(root,args=>check(root,args)));
 await assert.rejects(fs.access(path.join(root,'projects')),{code:'ENOENT'});
});
test('native validation failure removes prior readiness and cleans disposable fixture',async t=>{
 const root=await fixture(t);let checked;
 await assert.rejects(setup(root,()=>checkSetupProject(root,async args=>{checked=args[1];throw Error('strict validation failed');})),/strict validation failed/);
 await assert.rejects(fs.access(marker(root)),{code:'ENOENT'});
 await assert.rejects(fs.access(checked),{code:'ENOENT'});
});
test('dependency failure keeps readiness absent and prevents project checks',async t=>{
 const root=await fixture(t);let checked=false;
 const installDependencies=async()=>{throw Error('dependency failed');};
 await assert.rejects(setup(root,async()=>{await installDependencies();await checkSetupProject(root,()=>{checked=true;});}),/dependency failed/);
 assert.equal(checked,false);await assert.rejects(fs.access(marker(root)),{code:'ENOENT'});
});
test('verification failure after native check still prevents readiness',async t=>{
 const root=await fixture(t);
 await assert.rejects(setup(root,async()=>{await checkSetupProject(root,args=>check(root,args));throw Error('verify failed');}),/verify failed/);
 await assert.rejects(fs.access(marker(root)),{code:'ENOENT'});
 assert.deepEqual(await fs.readdir(path.join(root,'.runtime')),[]);
});

 test('optional narration failure preserves verified core readiness',async t=>{
 const {optionalVoiceSetup}=await import('../scripts/setup-validation.mjs');
 const root=await fixture(t),metadata={platform:'test'};
 await withSetupReadiness(path.join(root,'.runtime'),metadata,async()=>{metadata.voice=await optionalVoiceSetup(true,async()=>{throw Error('native library blocked');});});
 const receipt=JSON.parse(await fs.readFile(marker(root),'utf8'));assert.equal(receipt.voice.available,false);assert.match(receipt.voice.reason,/blocked/);
 let called=false;const skipped=await optionalVoiceSetup(false,async()=>{called=true;});assert.equal(called,false);assert.equal(skipped.available,false);
 assert.equal((await optionalVoiceSetup(true,async()=>{})).available,true);
});
