import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {create} from '../scripts/new-project.mjs';
import {configureTestBrand} from './brand-fixture.mjs';
async function fixture(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'jstudio-project-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));await fs.mkdir(path.join(root,'starter'),{recursive:true});await fs.writeFile(path.join(root,'starter/index.html'),'native');await configureTestBrand(root);return root;}
test('failed creation removes only its own partial project and permits retry',async t=>{const root=await fixture(t);await assert.rejects(()=>create('retry',root));await assert.rejects(()=>fs.access(path.join(root,'projects/retry')));await fs.mkdir(path.join(root,'node_modules/gsap/dist'),{recursive:true});await fs.writeFile(path.join(root,'node_modules/gsap/dist/gsap.min.js'),'fixture');await fs.mkdir(path.join(root,'starter/assets'));const project=await create('retry',root);assert.match(await fs.readFile(path.join(project,'editor/index.html'),'utf8'),/Your story starts here/);assert.match(await fs.readFile(path.join(project,'BRIEF.md'),'utf8'),/Minimum displayed player width/);});
test('existing project is never overwritten or removed',async t=>{const root=await fixture(t);await fs.mkdir(path.join(root,'projects/existing'),{recursive:true});await fs.writeFile(path.join(root,'projects/existing/index.html'),'user edit');await assert.rejects(()=>create('existing',root),{code:'EEXIST'});assert.equal(await fs.readFile(path.join(root,'projects/existing/index.html'),'utf8'),'user edit');});
test('Windows reserved names rejected on every host',async t=>{const root=await fixture(t);for(const name of ['con','prn','aux','nul','com1','lpt9','../escape'])await assert.rejects(()=>create(name,root),/Use a project name/);});

test('new project copies matched animation templates outside native discovery',async t=>{
 const root=await fixture(t);
 for(const folder of ['starter/assets','node_modules/gsap/dist','project-templates'])await fs.mkdir(path.join(root,folder),{recursive:true});
 await fs.writeFile(path.join(root,'node_modules/gsap/dist/gsap.min.js'),'fixture');
 const names=['ANIMATION-TREATMENT.md','ANIMATION-SEQUENCE.md','ANIMATION-REVIEW.md'];
 for(const file of names)await fs.writeFile(path.join(root,'project-templates',file),'draft '+file);
 const created=await create('planned',root);
 for(const file of names){assert.equal(await fs.readFile(path.join(created,file),'utf8'),'draft '+file);await assert.rejects(fs.access(path.join(created,'hyperframes',file)));}
});

test('portrait duration is pinned and reflected in native starter; invalid formats leave no project',async t=>{
 const root=await fixture(t);await fs.mkdir(path.join(root,'node_modules/gsap/dist'),{recursive:true});await fs.writeFile(path.join(root,'node_modules/gsap/dist/gsap.min.js'),'fixture');
 const project=await create('portrait',root,{width:1080,height:1920,duration:30});
 assert.deepEqual(JSON.parse(await fs.readFile(path.join(project,'PROJECT.json'),'utf8')).format,{width:1080,height:1920,duration:30});
 assert.match(await fs.readFile(path.join(project,'editor/index.html'),'utf8'),/data-width="1080" data-height="1920" data-duration="30"/);
 for(const options of [{width:101},{height:Infinity},{duration:0}])await assert.rejects(()=>create('invalid',root,options));
 await assert.rejects(()=>fs.access(path.join(root,'projects/invalid')));
});

test('creation preserves supplied request provenance and marks unknowns honestly',async t=>{
 const root=await fixture(t);await fs.mkdir(path.join(root,'node_modules/gsap/dist'),{recursive:true});await fs.writeFile(path.join(root,'node_modules/gsap/dist/gsap.min.js'),'fixture');
 const requestFile=path.join(root,'request.txt');await fs.writeFile(requestFile,'Create a brand film.\nKeep the approved wording.');
 const dir=await create('with-request',root,{initiator:'test-host',requestFile});const p=JSON.parse(await fs.readFile(path.join(dir,'PROJECT.json')));
 assert.equal(p.creationContext.initiator,'test-host');assert.match(p.creationContext.requestSha256,/^[a-f0-9]{64}$/);assert.equal(p.creationContext.identityVerified,false);
 assert.match(await fs.readFile(path.join(dir,'INTERACTION-LOG.md'),'utf8'),/> Keep the approved wording/);
 const unknown=await create('unknown-request',root);assert.equal(JSON.parse(await fs.readFile(path.join(unknown,'PROJECT.json'))).creationContext.request,null);
});
