import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {prepareCapture} from '../prepare-capture.mjs';
const root=path.resolve(process.env.STUDIO_TEST_ROOT||process.cwd());
const runtime=path.join(root,'scripts/runtime.mjs');
const available=fs.existsSync(runtime);
let env;if(available)({env}=await(await import(pathToFileURL(runtime).href)).runtimeEnvironment(root));
const run=args=>{const r=spawnSync(env.HYPERFRAMES_FFMPEG_PATH,args,{encoding:'utf8'});assert.equal(r.status,0,r.stderr);};
const withDir=async fn=>{const p=fs.mkdtempSync(path.join(os.tmpdir(),'capture-prepare-test-'));try{await fn(p);}finally{fs.rmSync(p,{recursive:true,force:true});}};
const opts={skip:available?false:'Run from an installed Studio root, or set STUDIO_TEST_ROOT.'};

test('durationless recorder-style WebM becomes finite CFR30 MP4 without changing original',opts,()=>withDir(async dir=>{
 const input=path.join(dir,'raw.webm'),output=path.join(dir,'new.mp4');
 run(['-v','error','-f','lavfi','-i','testsrc=size=320x240:rate=30','-t','0.6','-c:v','libvpx-vp9','-pix_fmt','yuv420p','-live','1',input]);
 const before=fs.readFileSync(input),receipt=await prepareCapture(root,input,output);
 assert.deepEqual(fs.readFileSync(input),before);assert.equal(receipt.source.media.format.duration,undefined);
 assert.equal(receipt.output.media.streams[0].avg_frame_rate,'30/1');assert.ok(Number(receipt.output.media.format.duration)>0);
 assert.equal(receipt.output.media.streams.filter(s=>s.codec_type==='audio').length,0);assert.equal(receipt.checks.fullDecode,true);
 assert.ok(fs.existsSync(output+'.capture.json'));assert.ok(!fs.existsSync(output+'.prepare.lock'));
}));

test('odd dimensions padded safely and source audio retained',opts,()=>withDir(async dir=>{
 const input=path.join(dir,'odd.mkv'),output=path.join(dir,'safe.mp4');
 run(['-v','error','-f','lavfi','-i','testsrc=size=321x241:rate=15','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','0.4','-c:v','ffv1','-c:a','pcm_s16le',input]);
 const r=await prepareCapture(root,input,output),v=r.output.media.streams.find(s=>s.codec_type==='video');
 assert.equal(v.width,322);assert.equal(v.height,242);assert.equal(r.output.media.streams.filter(s=>s.codec_type==='audio').length,1);
}));

test('existing output, receipt and dangling symlink are preserved',()=>withDir(async dir=>{
 const input=path.join(dir,'source.webm'),output=path.join(dir,'existing.mp4');fs.writeFileSync(input,'source');fs.writeFileSync(output,'keep');
 await assert.rejects(prepareCapture(root,input,output),/already exists/);assert.equal(fs.readFileSync(output,'utf8'),'keep');
 fs.unlinkSync(output);fs.writeFileSync(output+'.capture.json','receipt');await assert.rejects(prepareCapture(root,input,output),/Receipt already exists/);assert.equal(fs.readFileSync(output+'.capture.json','utf8'),'receipt');
 if(process.platform!=='win32'){fs.unlinkSync(output+'.capture.json');fs.symlinkSync(path.join(dir,'absent'),output);await assert.rejects(prepareCapture(root,input,output),/already exists/);assert.ok(fs.lstatSync(output).isSymbolicLink());}
}));

test('corrupt source fails without output and clears owned staging/lock',opts,()=>withDir(async dir=>{
 const input=path.join(dir,'corrupt.webm'),output=path.join(dir,'never.mp4');fs.writeFileSync(input,'not a video');
 await assert.rejects(prepareCapture(root,input,output),/failed/);assert.deepEqual(fs.readdirSync(dir),['corrupt.webm']);
}));

test('existing preparation lock is preserved and prevents competing writer',()=>withDir(async dir=>{
 const input=path.join(dir,'source.webm'),output=path.join(dir,'new.mp4');fs.writeFileSync(input,'source');fs.writeFileSync(output+'.prepare.lock','other process');
 await assert.rejects(prepareCapture(root,input,output),/EEXIST/);assert.equal(fs.readFileSync(output+'.prepare.lock','utf8'),'other process');
}));
