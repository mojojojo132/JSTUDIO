import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {finishEditorExport} from '../scripts/editor-export.mjs';
import {patchStudioExport,verifyStudioExport,exportStart,exportEnd} from '../scripts/patch-studio-export.mjs';
function fixture(t){
 const project=fs.mkdtempSync(path.join(os.tmpdir(),'editor-export-'));t.after(()=>fs.rmSync(project,{recursive:true,force:true}));
 const native=path.join(project,'hyperframes');fs.mkdirSync(native);fs.writeFileSync(path.join(project,'PROJECT.json'),JSON.stringify({nativeProject:'hyperframes',workflow:{version:1}}));
 fs.writeFileSync(path.join(project,'EXCHANGE.json'),JSON.stringify({nativeRoot:'hyperframes',master:{width:1920,height:1080,fps:'24/1'},shots:[]}));
 const opts={project:{dir:native},fps:{num:24,den:1},outputPath:path.join(native,'cut.mp4'),jobId:'fixture'};
 let checks=0;
 return {project,native,opts,get checks(){return checks;},config:{env:{},loadTools:async()=>({preflight:()=>{checks++;return {nativeFiles:[],mediaFiles:[],nativeDuration:2};},probe:()=>({width:1920,height:1080,fps:'24/1',duration:2})})},render:async()=>fs.writeFileSync(opts.outputPath,'encoded fixture')};
}
test('native editor successful export shares finishing receipt and records unavailable tokens',async t=>{
 const f=fixture(t),r=await finishEditorExport(f.opts,f.render,f.config);assert.equal(r.output.verified,true);assert.equal(f.checks,2);
 const runs=path.join(f.project,'evidence/runs'),dir=path.join(runs,fs.readdirSync(runs)[0]);
 assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'EDITOR-EXPORT.json'))).status,'completed');
 const tokens=JSON.parse(fs.readFileSync(path.join(dir,'RUN-REPORT.json')));assert.equal(tokens.operation.route,'native-editor-export');assert.equal(tokens.operation.status,'completed');assert.equal(tokens.operation.invocation.transport,'native-editor-api');assert.ok(tokens.operation.build);assert.equal(tokens.coverage.complete,false);assert.equal(tokens.entries[0].tokens.total,null);
});
test('native editor outputResolution is forwarded through finishing and recorded as expected output',async t=>{
 const f=fixture(t);f.opts.outputResolution='landscape-4k';f.config.loadTools=async()=>({preflight:()=>({nativeFiles:[],mediaFiles:[],nativeDuration:2}),probe:()=>({width:3840,height:2160,fps:'24/1',duration:2})});
 const r=await finishEditorExport(f.opts,f.render,f.config);assert.deepEqual(r.expectedOutput,{width:3840,height:2160,resolution:'landscape-4k',requestedResolution:'landscape-4k',scale:2});
 const runs=path.join(f.project,'evidence/runs'),dir=path.join(runs,fs.readdirSync(runs)[0]),report=JSON.parse(fs.readFileSync(path.join(dir,'RUN-REPORT.json')));assert.deepEqual(report.operation.invocation.arguments.slice(-2),['--resolution','landscape-4k']);
});
test('native editor blocks mismatched FPS and missing managed exchange before rendering',async t=>{
 for(const failure of ['fps','exchange']){
  const f=fixture(t);let ran=false;
  if(failure==='fps')f.opts.fps={num:30,den:1};else{fs.unlinkSync(path.join(f.project,'EXCHANGE.json'));fs.writeFileSync(path.join(f.project,'REVIEW.json'),JSON.stringify({imports:[{}]}));}
  await assert.rejects(finishEditorExport(f.opts,async()=>{ran=true;},f.config),/frame rate|requires EXCHANGE/);assert.equal(ran,false);
  const runs=path.join(f.project,'evidence/runs'),dir=path.join(runs,fs.readdirSync(runs)[0]);assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'EDITOR-EXPORT.json'))).status,'failed');
 }
});
test('native Editor export blocks the real missing-timeline warning before capture and accepts its repair',async t=>{
 const f=fixture(t),entry=marker=>`<!doctype html><html><body><main data-composition-id="main"${marker} data-width="1920" data-height="1080" data-duration="2"></main></body></html>`;let ran=false;
 fs.writeFileSync(path.join(f.native,'index.html'),entry(''));
 await assert.rejects(finishEditorExport(f.opts,async()=>{ran=true;},f.config),/missing_data_no_timeline/);assert.equal(ran,false);
 fs.writeFileSync(path.join(f.native,'index.html'),entry(' data-no-timeline'));
 const receipt=await finishEditorExport(f.opts,async()=>{ran=true;await f.render();},f.config);
 assert.equal(ran,true);assert.equal(receipt.editorLint.version,'0.8.77');assert.equal(receipt.editorLint.passed,true);
});
test('native manual edits changed during render cannot receive clean finishing receipt',async t=>{
 const f=fixture(t);await assert.rejects(finishEditorExport(f.opts,async()=>{await f.render();fs.mkdirSync(path.join(f.native,'.hyperframes'));fs.writeFileSync(path.join(f.native,'.hyperframes/studio-manual-edits.json'),'changed');},f.config),/editor changes/);
 assert.equal(fs.existsSync(path.join(f.project,'evidence/finishing')),false);
});
test('pinned patch is idempotent and fails closed on unknown signatures',t=>{
 const f=fixture(t),pkg=path.join(f.project,'package');fs.mkdirSync(path.join(pkg,'dist'),{recursive:true});fs.writeFileSync(path.join(pkg,'package.json'),'{"version":"0.8.77"}');
 const cli=path.join(pkg,'dist/cli.js'),source=exportStart+'\n          const job = createRenderJob2({});\n            removeCancelledOutput();\n            return;\n'+exportEnd;fs.writeFileSync(cli,source);
 assert.equal(patchStudioExport(pkg).changed,true);assert.equal(verifyStudioExport(pkg).verified,true);assert.equal(patchStudioExport(pkg).changed,false);
 fs.writeFileSync(cli,'unknown');assert.throws(()=>patchStudioExport(pkg),/signature/);assert.equal(fs.readFileSync(cli,'utf8'),'unknown');
});
// Execute the patched, actual pinned adapter, not a second implementation of its control flow.
const nativeCandidates=[new URL('../node_modules/hyperframes/dist/cli.js',import.meta.url),new URL('../../../../Studio/runtime/node_modules/hyperframes/dist/cli.js',import.meta.url)];
const nativeFile=nativeCandidates.find(file=>fs.existsSync(file));
test('actual native adapter retains progress, completion, failure and cancellation',async t=>{
 assert.ok(nativeFile,'Pinned Editor dependency required for adapter test');
 for(const scenario of ['success','guard-failure','cancel']){
  const f=fixture(t),pkg=path.join(f.project,'package');fs.mkdirSync(path.join(pkg,'dist'),{recursive:true});fs.writeFileSync(path.join(pkg,'package.json'),'{"version":"0.8.77"}');fs.copyFileSync(nativeFile,path.join(pkg,'dist/cli.js'));patchStudioExport(pkg);
  const source=fs.readFileSync(path.join(pkg,'dist/cli.js'),'utf8'),start=source.indexOf('    startRender(opts) {'),end=source.indexOf('    startBackgroundRemoval(opts)',start);
  assert.ok(start>0&&end>start);
  const method=source.slice(start,end).replace('await import(new URL("../../../scripts/editor-export.mjs", import.meta.url).href)','({finishEditorExport: guardedExport})');
  let executed=false,completed=false;const inFlightRenders=new Map();
  const ctx={shuttingDown:false,refreshTelemetryPosture(){},AbortController,Date,inFlightRenders,guardedExport:(opts,run)=>{
   if(scenario==='guard-failure')throw Error('Guard rejected changed source');return finishEditorExport(opts,run,f.config);
  },loadStudioProducer:async()=>({createRenderJob:()=>({progress:0}),executeRenderJob:async(job,dir,output,onProgress,signal)=>{executed=true;job.progress=42;onProgress(job);if(scenario==='cancel')state.cancel();else await f.render();}}),resolveRenderBrowser:async()=>({executablePath:'/fake/browser'}),process:{env:{}},readStudioManualEditManifestContent:()=>'',createStudioManualEditsRenderBodyScript:()=>'',existsSync75:fs.existsSync,unlinkSync6:fs.unlinkSync,writeFileSync30:fs.writeFileSync,emitStudioRenderComplete(){completed=true;},emitStudioRenderError(){}};
  const adapter=new Function('ctx',`with(ctx){ return ({${method}}); }`)(ctx),state=adapter.startRender(f.opts);
  await Promise.all([...inFlightRenders.values()]);
  assert.equal(state.status,scenario==='success'?'complete':scenario==='cancel'?'cancelled':'failed');
  assert.equal(executed,scenario!=='guard-failure');assert.equal(completed,scenario==='success');assert.equal(state.progress,scenario==='success'?100:scenario==='cancel'?42:0);
  if(scenario!=='success')assert.equal(fs.existsSync(path.join(f.project,'evidence/finishing')),false);
 }
});
