import {test,after} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {finishRender} from '../scripts/finishing.mjs';
const suite=fs.mkdtempSync(path.join(os.tmpdir(),'studio finishing '));after(()=>fs.rmSync(suite,{recursive:true,force:true}));
function fixture(exchange=true){const project=fs.mkdtempSync(path.join(suite,'project ')),native=path.join(project,'hyperframes');fs.mkdirSync(native);fs.writeFileSync(path.join(project,'PROJECT.json'),JSON.stringify({nativeProject:'hyperframes'}));const contract={schema:1,nativeRoot:'hyperframes',master:{width:1920,height:1080,fps:'24/1'},shots:[],export:'old-missing.mp4'};if(exchange)fs.writeFileSync(path.join(project,'EXCHANGE.json'),JSON.stringify(contract));const calls=[];let checkCalls=0;const check={ok:true,nativeDuration:8,nativeFiles:[{file:'index.html',sha256:'fixture'}],limitations:['Static inputs only']};return {project,native,contract,calls,options:{runtime:suite,cwd:project,env:{},loadTools:async()=>({preflight:(_p,c)=>{checkCalls++;assert.equal(c.export,undefined);return check;},probe:()=>({width:1920,height:1080,fps:'24/1',duration:8})}),runRender:async args=>{calls.push(args);}},get checkCalls(){return checkCalls;}};}
test('legacy render passes unchanged without loading handoff tools',async()=>{const f=fixture(false);f.options.loadTools=()=>{throw Error('must not load');};await finishRender(['render','hyperframes','--fps','30'],f.options);assert.deepEqual(f.calls,[['render','hyperframes','--fps','30']]);});
test('non-render actions remain unrestricted',async()=>{const f=fixture();f.options.loadTools=()=>{throw Error('must not load');};await finishRender(['check','hyperframes'],f.options);assert.equal(f.calls.length,1);});
test('mismatched explicit FPS fails before renderer starts',async()=>{for(const flags of [['--fps','30'],['--fps=30'],['-f','30']]){const f=fixture();await assert.rejects(finishRender(['render','hyperframes',...flags],f.options),/frame rate/);assert.equal(f.calls.length,0);}});
test('relative project argument resolves and contract FPS is injected',async()=>{const f=fixture();const receipt=await finishRender(['render','hyperframes'],f.options);assert.deepEqual(f.calls[0],['render','hyperframes','--fps','24/1']);assert.equal(f.checkCalls,2);assert.equal(receipt.output.verified,false);assert.equal(fs.readdirSync(path.join(f.project,'evidence/finishing')).length,1);});
test('equivalent rational FPS is retained',async()=>{const f=fixture();await finishRender(['render','hyperframes','--fps=24'],f.options);assert.deepEqual(f.calls[0],['render','hyperframes','--fps=24']);});
test('changed clip/preflight failure prevents renderer invocation',async()=>{const f=fixture();f.options.loadTools=async()=>({preflight:()=>{throw Error('Changed imported clip');}});await assert.rejects(finishRender(['render','hyperframes'],f.options),/Changed imported/);assert.equal(f.calls.length,0);});
test('managed render blocks on Editor lint before native capture',async()=>{const f=fixture();fs.writeFileSync(path.join(f.project,'PROJECT.json'),JSON.stringify({nativeProject:'hyperframes',workflow:{version:1}}));fs.writeFileSync(path.join(f.native,'index.html'),'<video></video>');f.options.lintEditor=()=>{throw Error('Editor lint must pass before capture. missing_data_no_timeline: Add data-no-timeline');};await assert.rejects(finishRender(['render','hyperframes'],f.options),/missing_data_no_timeline.*Add data-no-timeline/);assert.equal(f.calls.length,0);assert.equal(f.checkCalls,0);});
test('managed finishing receipts record successful pinned Editor lint',async()=>{const f=fixture();fs.writeFileSync(path.join(f.project,'PROJECT.json'),JSON.stringify({nativeProject:'hyperframes',workflow:{version:1}}));fs.writeFileSync(path.join(f.native,'index.html'),'<video data-no-timeline></video>');let linted=0;f.options.lintEditor=()=>{linted++;return {passed:true,skipped:false,version:'0.8.77',filesScanned:1,warningCount:0};};const receipt=await finishRender(['render','hyperframes'],f.options);assert.equal(linted,1);assert.equal(receipt.editorLint.version,'0.8.77');assert.equal(f.calls.length,1);});
test('flags before relative directory preserve native positional resolution',async()=>{const f=fixture();await finishRender(['render','--quality','looks','hyperframes'],f.options);assert.equal(f.checkCalls,2);});
test('explicit output receives measured settings check and receipt',async()=>{const f=fixture();f.options.runRender=async args=>{f.calls.push(args);fs.writeFileSync(path.join(f.project,'cut.mp4'),'fixture bytes');};const receipt=await finishRender(['render','hyperframes','--output','cut.mp4'],f.options);assert.equal(receipt.output.verified,true);assert.equal(receipt.output.sha256.length,64);});
test('4K output validates encoded dimensions and records target while preserving source master',async()=>{const f=fixture();f.options.runRender=async args=>{f.calls.push(args);fs.writeFileSync(path.join(f.project,'cut.mp4'),'fixture bytes');};f.options.loadTools=async()=>({preflight:()=>({nativeDuration:8,nativeFiles:[],mediaFiles:[]}),probe:()=>({width:3840,height:2160,fps:'24/1',duration:8})});const receipt=await finishRender(['render','hyperframes','--resolution','landscape-4k','--output','cut.mp4'],f.options);assert.deepEqual(receipt.master,{width:1920,height:1080,fps:'24/1'});assert.deepEqual(receipt.expectedOutput,{width:3840,height:2160,resolution:'landscape-4k',requestedResolution:'landscape-4k',scale:2});assert.deepEqual(receipt.output.expected,receipt.expectedOutput);});
test('aspect mismatch, downsampling, and non-integer scale fail before renderer',async()=>{for(const [master,resolution,expected] of [[{width:1920,height:1080,fps:'24/1'},'portrait',/aspect ratio/],[{width:3840,height:2160,fps:'24/1'},'landscape',/downsampling/],[{width:1280,height:720,fps:'24/1'},'landscape',/non-integer scale/]]){const f=fixture();f.contract.master=master;fs.writeFileSync(path.join(f.project,'EXCHANGE.json'),JSON.stringify(f.contract));await assert.rejects(finishRender(['render','hyperframes','--resolution',resolution],f.options),expected);assert.equal(f.calls.length,0);}});
test('aspect agnostic aliases follow the master orientation using pinned presets',async()=>{const f=fixture();f.contract.master={width:1080,height:1920,fps:'24/1'};fs.writeFileSync(path.join(f.project,'EXCHANGE.json'),JSON.stringify(f.contract));f.options.runRender=async args=>{f.calls.push(args);fs.writeFileSync(path.join(f.project,'cut.mp4'),'fixture bytes');};f.options.loadTools=async()=>({preflight:()=>({nativeDuration:8,nativeFiles:[],mediaFiles:[]}),probe:()=>({width:2160,height:3840,fps:'24/1',duration:8})});const receipt=await finishRender(['render','hyperframes','--resolution','4k','--output','cut.mp4'],f.options);assert.equal(receipt.expectedOutput.resolution,'portrait-4k');assert.equal(receipt.expectedOutput.scale,2);});
test('shortened or wrong-cadence output is rejected',async()=>{for(const changed of [{duration:4},{fps:'30/1'},{width:1280}]){const f=fixture();f.options.loadTools=async()=>({preflight:()=>({nativeDuration:8,nativeFiles:[]}),probe:()=>({width:1920,height:1080,fps:'24/1',duration:8,...changed})});await assert.rejects(finishRender(['render','hyperframes','-o','cut.mp4'],f.options),/Rendered output/);assert.equal(f.calls.length,1);}});
test('contract change during render cannot receive a clean receipt',async()=>{const f=fixture();f.options.runRender=async()=>fs.appendFileSync(path.join(f.project,'EXCHANGE.json'),' ');await assert.rejects(finishRender(['render','hyperframes'],f.options),/changed during render/);});
test('rendering different native root or composition fails explicitly',async()=>{const f=fixture();await assert.rejects(finishRender(['render','hyperframes','--composition','other.html'],f.options),/composition disagrees/);assert.equal(f.calls.length,0);});
test('default current native directory finds project ancestor',async()=>{const f=fixture();f.options.cwd=f.native;await finishRender(['render'],f.options);assert.equal(f.checkCalls,2);});

import {configureTestBrand} from './brand-fixture.mjs';
import {pinProjectBrand,materializeAnimationBrand} from '../scripts/brand.mjs';
async function brandedFixture(){const f=fixture(false),runtime=path.join(f.project,'runtime');fs.mkdirSync(runtime);await configureTestBrand(runtime);await pinProjectBrand(f.project,runtime,{newProject:true});return f;}
test('direct finishing helper blocks native brand drift before footage-only render',async()=>{const f=await brandedFixture();fs.appendFileSync(path.join(f.native,'assets/brand/logo.svg'),'drift');await assert.rejects(finishRender(['render','hyperframes'],f.options),/integrity failed \(native\)/);assert.equal(f.calls.length,0);});
test('footage-only rendering checks brand again after capture',async()=>{const f=await brandedFixture();f.options.runRender=async()=>fs.appendFileSync(path.join(f.native,'assets/brand/logo.svg'),'drift');await assert.rejects(finishRender(['render','hyperframes'],f.options),/integrity failed \(native\)/);});
test('native finishing does not require a mutable animation workspace to be intact',async()=>{const f=await brandedFixture();await materializeAnimationBrand(f.project,path.join(f.project,'animation'));fs.appendFileSync(path.join(f.project,'animation/app/public/brand/logo.svg'),'drift');await finishRender(['render','hyperframes'],f.options);assert.equal(f.calls.length,1);});
test('pinned native render cannot check one directory while rendering another',async()=>{const f=await brandedFixture();fs.mkdirSync(path.join(f.project,'other'));await assert.rejects(finishRender(['render','other'],f.options),/Editor directory/);assert.equal(f.calls.length,0);});

test('declared footage changes during render cannot receive finishing receipt',async()=>{
 const f=fixture();let changed=false;f.options.loadTools=async()=>({preflight:()=>({ok:true,nativeFiles:[],mediaFiles:[{file:'capture.mp4',sha256:changed?'new':'old'}],nativeDuration:8}),probe:()=>({width:1920,height:1080,fps:'24/1',duration:8})});
 f.options.runRender=async()=>{changed=true;};await assert.rejects(finishRender(['render','hyperframes'],f.options),/source media changed/);
});

test('review candidate strips private flag, validates both passes, measures output without approval',async()=>{
 const f=fixture(),output=path.join(f.project,'reviews/candidates/v1.mp4'),modes=[];
 f.options.loadTools=async()=>({preflight:(_p,_c,options)=>{modes.push(options.reviewOnly);return {nativeDuration:8,nativeFiles:[],mediaFiles:[]};},probe:()=>({width:1920,height:1080,fps:'24/1',duration:8})});
 f.options.runRender=async args=>{f.calls.push(args);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,'candidate');};
 const receipt=await finishRender(['render','hyperframes','--review-only','--output',output],f.options);
 assert.deepEqual(modes,[true,true]);assert.equal(f.calls[0].includes('--review-only'),false);
 assert.equal(receipt.reviewOnly,true);assert.equal(receipt.approval,false);assert.equal(receipt.output.verified,true);
 assert.match(receipt.scope,/no component approval/);
});
test('ordinary finishing never enables review-only preflight',async()=>{
 const f=fixture();f.options.loadTools=async()=>({preflight:(_p,_c,o)=>{assert.equal(o.reviewOnly,false);throw Error('Unapproved shot');}});
 await assert.rejects(finishRender(['render','hyperframes'],f.options),/Unapproved shot/);assert.equal(f.calls.length,0);
});
test('review-only rejects missing, duplicate, non-video and delivery destinations before rendering',async()=>{
 for(const flags of [[],['-o','delivery.mp4'],['-o','reviews/candidates/../final.mp4'],['-o','reviews/candidates/still.png'],['-o','reviews/candidates/a.mp4','--output','reviews/candidates/b.mp4']]){
  const f=fixture();await assert.rejects(finishRender(['render','hyperframes','--review-only',...flags],f.options),/Review-only/);assert.equal(f.calls.length,0);
 }
});
test('review candidates cannot overwrite existing files or follow output symlinks',async()=>{
 for(const symlink of [false,true]){const f=fixture(),dir=path.join(f.project,'reviews/candidates');fs.mkdirSync(path.dirname(dir),{recursive:true});
  if(symlink)fs.symlinkSync(f.native,dir);else {fs.mkdirSync(dir);fs.writeFileSync(path.join(dir,'v1.mp4'),'approved');}
  await assert.rejects(finishRender(['render','hyperframes','--review-only','-o','reviews/candidates/v1.mp4'],f.options),symlink?/symlink/:/already exists/);assert.equal(f.calls.length,0);
 }
});
test('footage-only review candidate requires exchange instead of bypassing integrity checks',async()=>{
 const f=fixture(false);await assert.rejects(finishRender(['render','hyperframes','--review-only','-o','reviews/candidates/v1.mp4'],f.options),/requires EXCHANGE/);assert.equal(f.calls.length,0);
});
test('review-only still rejects source drift and wrong encoded settings',async()=>{
 for(const sourceDrift of [true,false]){const f=fixture();let pass=0;
 f.options.loadTools=async()=>({preflight:()=>({nativeDuration:8,nativeFiles:[{sha256:sourceDrift?String(pass++):'same'}]}),probe:()=>({width:640,height:480,fps:'24/1',duration:8})});
 await assert.rejects(finishRender(['render','hyperframes','--review-only','-o','reviews/candidates/v1.mp4'],f.options),sourceDrift?/Native HTML changed/:/canvas\/frame rate/);
 }
});
test('review-only exchange cannot enter ordinary finishing even if shots are empty',async()=>{
 const f=fixture();fs.writeFileSync(path.join(f.project,'EXCHANGE.json'),JSON.stringify({...f.contract,reviewOnly:true}));
 await assert.rejects(finishRender(['render','hyperframes'],f.options),/requires explicit --review-only/);assert.equal(f.calls.length,0);
});
