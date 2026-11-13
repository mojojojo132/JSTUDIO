import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import {patchStudioMediaReadiness,verifyStudioMediaReadiness,mediaReadinessSignature} from '../scripts/patch-studio-media-readiness.mjs';

function fixture(t,source=mediaReadinessSignature[0],version='0.8.77') {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'torq-media-policy-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 fs.mkdirSync(path.join(dir,'dist'));fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({version}));
 fs.writeFileSync(path.join(dir,'dist/cli.js'),source);return dir;
}
test('media repair is idempotent and required by verification',t=>{
 const dir=fixture(t);assert.throws(()=>verifyStudioMediaReadiness(dir),/missing/);
 assert.equal(patchStudioMediaReadiness(dir).changed,true);verifyStudioMediaReadiness(dir);
 const before=fs.readFileSync(path.join(dir,'dist/cli.js'),'utf8');
 assert.equal(patchStudioMediaReadiness(dir).changed,false);assert.equal(fs.readFileSync(path.join(dir,'dist/cli.js'),'utf8'),before);
});
test('version, drift and duplicate signatures fail without mutation',t=>{
 for(const [source,version] of [[mediaReadinessSignature[0],'0.8.78'],['unexpected','0.8.77'],[mediaReadinessSignature[0].repeat(2),'0.8.77'],[mediaReadinessSignature.join('\n'),'0.8.77']]){
  const dir=fixture(t,source,version);assert.throws(()=>patchStudioMediaReadiness(dir));
  assert.equal(fs.readFileSync(path.join(dir,'dist/cli.js'),'utf8'),source);
 }
});
function nativePolicy(t){
 const file=new URL('../node_modules/hyperframes/dist/cli.js',import.meta.url);
 const dir=fixture(t,fs.readFileSync(file,'utf8'));patchStudioMediaReadiness(dir);
 const source=fs.readFileSync(path.join(dir,'dist/cli.js'),'utf8');
 const a=source.indexOf('function applyRenderWarningPolicy('), b=source.indexOf('function createRenderFileLogger(',a);
 assert.ok(a>=0&&b>a);
 class RenderQualityError extends Error {constructor(warnings){super(warnings.map(w=>w.message).join('\n'));this.warnings=warnings;}}
 return vm.runInNewContext(source.slice(a,b)+'\napplyRenderWarningPolicy',{RenderQualityError,cloneCaptureWarning:structuredClone,defaultLogger:{warn(){}}});
}
test('actual failed image and video loads block best-effort with actionable source',t=>{
 const apply=nativePolicy(t);
 for(const mediaType of ['image','video']){
  const job={config:{strictness:'best-effort'}};
  assert.throws(()=>apply(job,[{code:'media_load_failed',message:'load failed',details:{mediaType,sources:['http://localhost:123/assets/missing.svg']}}]),/assets\/missing.svg.*Restore.*retry export/);
  assert.equal(job.warnings[0].stage,'capture-readiness');
 }
});
test('best-effort preserves timeout and unrelated warnings; strict still blocks them',t=>{
 const apply=nativePolicy(t);
 for(const code of ['media_readiness_timeout','unrelated_warning']){
  const warning={code,message:'diagnostic only'};const job={config:{strictness:'best-effort'}};
  assert.doesNotThrow(()=>apply(job,[warning]));assert.equal(job.warnings[0].message,'diagnostic only');
  assert.throws(()=>apply({config:{strictness:'strict'}},[warning]),/diagnostic only/);
 }
 assert.doesNotThrow(()=>apply({config:{}},[]));
});
test('existing audio and timeline failures remain fatal; duplicate warnings remain deduplicated',t=>{
 const apply=nativePolicy(t);
 for(const code of ['audio_processing_failed','sub_timeline_script_failure'])assert.throws(()=>apply({config:{}},[{code,message:code}]),new RegExp(code));
 const job={config:{}};const warning={code:'media_load_failed',message:'bad image',details:{sources:['assets/a.svg']}};
 assert.throws(()=>apply(job,[warning,warning]));assert.equal(job.warnings.length,1);
});
