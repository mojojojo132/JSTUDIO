import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {inspectCaptions,parseCaptionFile} from '../scripts/caption-qc.mjs';

const probe={format:{duration:'4.25'},streams:[{codec_type:'video'}]};
function fakeRun({mutate}={}){return async(_cmd,args)=>{if(mutate)await mutate(args);return {stdout:JSON.stringify(probe),stderr:''};};}
async function fixture(t,{captions='1\n00:00:00,000 --> 00:00:01,000\nHello world.\n',transcript='Hello world.'}={}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'caption-qc-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.writeFile(path.join(root,'candidate.mp4'),'encoded fixture');await fs.writeFile(path.join(root,'captions.srt'),captions);
 if(transcript!==null)await fs.writeFile(path.join(root,'transcript.txt'),transcript);
 return {root,input:{media:'candidate.mp4',captions:'captions.srt',...(transcript===null?{}:{transcript:'transcript.txt'})}};
}

test('parses SRT and WebVTT timestamps, cue ids and metadata',()=>{
 const srt=parseCaptionFile('1\n00:00:01,250 --> 00:00:02,500\nHello.\n','srt');
 assert.equal(srt.cues[0].start,1.25);assert.equal(srt.cues[0].end,2.5);assert.equal(srt.diagnostics.length,0);
 const vtt=parseCaptionFile('WEBVTT\n\nNOTE a note\nignored\n\ncue-id\n00:01.000 --> 00:02.000 align:start\nWorld\n','vtt');
 assert.equal(vtt.cues[0].start,1);assert.equal(vtt.cues[0].text,'World');assert.equal(vtt.diagnostics.length,0);
});

test('malformed timings, empty cues, order errors and duration overflow fail',async t=>{
 const f=await fixture(t,{captions:'1\n00:00:02,000 --> 00:00:01,000\n \n\n2\n00:00:01,000 --> 00:00:03,000\nSecond\n\n3\nno time\nBroken\n\n4\n00:00:04,000 --> 00:00:05,000\nToo late\n',transcript:null});
 const result=await inspectCaptions(f.root,f.input,{run:fakeRun()});
 assert.equal(result.receipt.status,'failed');
 const names=result.receipt.checks.map(item=>item.check);
 assert(names.includes('cue-empty'));assert(names.includes('cue-duration'));assert(names.includes('cue-order'));assert(names.includes('cue-syntax'));
 assert.equal(result.receipt.approval,false);assert.equal(result.receipt.viewed,false);assert.equal(result.receipt.listened,false);
});

test('an empty caption file gets a failed, hash-bound receipt',async t=>{
 const f=await fixture(t);await fs.writeFile(path.join(f.root,'captions.srt'),'');
 const result=await inspectCaptions(f.root,f.input,{run:fakeRun()});
 assert.equal(result.receipt.status,'failed');assert.equal(result.receipt.captions.bytes,0);
 assert(result.receipt.checks.some(item=>item.check==='cue-presence'&&item.status==='fail'));
});

test('overlap, CPS and line-length are advisory unless a declared expectation fails',async t=>{
 const f=await fixture(t,{captions:'1\n00:00:00,000 --> 00:00:01,000\nA very long caption line\n\n2\n00:00:00,500 --> 00:00:02,000\nSecond caption\n',transcript:null});
 const advisory=await inspectCaptions(f.root,f.input,{run:fakeRun()});
 assert.equal(advisory.receipt.status,'passed');assert(advisory.receipt.advisories.some(x=>x.check==='cue-overlap'));
 const enforced=await inspectCaptions(f.root,{...f.input,expect:{noOverlap:true,maxCps:5,maxLineChars:8,maxLines:1}},{run:fakeRun()});
 assert.equal(enforced.receipt.status,'failed');assert(enforced.receipt.checks.some(x=>x.check==='cue-overlap'));
 assert(enforced.receipt.checks.some(x=>x.check==='readability:maxCps'));
 assert(enforced.receipt.checks.some(x=>x.check==='readability:maxLineChars'));
});

test('speech intervals produce advisory gaps and transcript comparison is literal only',async t=>{
 const f=await fixture(t,{captions:'1\n00:00:00,000 --> 00:00:01,000\nHello, world!\n',transcript:'Hello, brave world.'});
 const result=await inspectCaptions(f.root,{...f.input,speechIntervals:[{start:0,end:2}]},{run:fakeRun()});
 assert.equal(result.receipt.status,'passed');
 assert.equal(result.receipt.transcriptCoverage.matchedTokens,2);assert.equal(result.receipt.transcriptCoverage.transcriptTokens,3);
 assert.match(result.receipt.transcriptCoverage.caveat,/does not establish semantic/);
 assert(result.receipt.advisories.some(x=>x.check==='declared-speech-gaps'));
 assert(result.receipt.limitations.some(x=>x.includes('Declared speech intervals are user-supplied')));
});

test('large mismatched transcript coverage remains bounded',async t=>{
 const count=30000,f=await fixture(t,{captions:`1\n00:00:00,000 --> 00:00:04,000\n${'present '.repeat(count)}\n`,transcript:'absent '.repeat(count)});
 const result=await inspectCaptions(f.root,f.input,{run:fakeRun()});
 assert.equal(result.receipt.transcriptCoverage.matchedTokens,0);
 assert.equal(result.receipt.transcriptCoverage.transcriptTokens,count);
});

test('receipt binds exact media, caption and transcript bytes and is immutable',async t=>{
 const f=await fixture(t),a=await inspectCaptions(f.root,f.input,{run:fakeRun()}),b=await inspectCaptions(f.root,f.input,{run:fakeRun()});
 assert.notEqual(a.receiptPath,b.receiptPath);
 assert.equal(a.receipt.media.sha256,crypto.createHash('sha256').update('encoded fixture').digest('hex'));
 assert.equal(a.receipt.captions.sha256,crypto.createHash('sha256').update(await fs.readFile(path.join(f.root,'captions.srt'))).digest('hex'));
 assert.equal(a.receipt.transcript.sha256,crypto.createHash('sha256').update('Hello world.').digest('hex'));
 assert.equal(a.receipt.measured.durationSeconds,4.25);
});

test('rejects path traversal and any symlink input',async t=>{
 const f=await fixture(t);await assert.rejects(inspectCaptions(f.root,{...f.input,captions:'../captions.srt'},{run:fakeRun()}),/project-relative/);
 await fs.symlink(path.join(f.root,'captions.srt'),path.join(f.root,'link.srt'));
 await assert.rejects(inspectCaptions(f.root,{...f.input,captions:'link.srt'},{run:fakeRun()}),/symlinks/);
});

test('rejects input mutation during probing and records probe failure as technical failure',async t=>{
 const f=await fixture(t);
 await assert.rejects(inspectCaptions(f.root,f.input,{run:fakeRun({mutate:async args=>{if(args[0]==='-v')await fs.writeFile(path.join(f.root,'captions.srt'),'changed');}})}),/changed during/);
 const retry=await inspectCaptions(f.root,f.input,{run:async()=>{throw Error('probe failed');}});
 assert.equal(retry.receipt.status,'failed');assert.equal(retry.receipt.measured.durationSeconds,null);
 assert(retry.receipt.checks.some(x=>x.check==='media-duration'&&x.status==='fail'));
});

test('large media is streamed while oversized caption text is rejected before probing',async t=>{
 const f=await fixture(t);const media=path.join(f.root,'candidate.mp4');await fs.truncate(media,32*1024*1024);
 const result=await inspectCaptions(f.root,f.input,{run:fakeRun()});
 assert.equal(result.receipt.media.bytes,32*1024*1024);assert.match(result.receipt.media.sha256,/^[a-f0-9]{64}$/);
 await fs.truncate(path.join(f.root,'captions.srt'),8*1024*1024+1);
 let probed=false;
 await assert.rejects(inspectCaptions(f.root,f.input,{run:async()=>{probed=true;return {stdout:JSON.stringify(probe)};}}),/8 MiB|8388608-byte text limit/);
 assert.equal(probed,false);
});

test('invalid expectations and speech-gap tolerance are rejected before probe',async t=>{
 const f=await fixture(t);
 for(const input of [{...f.input,expect:{maxCps:0}},{...f.input,speechGapToleranceSeconds:-0.1},{...f.input,speechIntervals:[{start:1,end:1}]}]){
  let probed=false;
  await assert.rejects(inspectCaptions(f.root,input,{run:async()=>{probed=true;return {stdout:JSON.stringify(probe)};}}));
  assert.equal(probed,false);
 }
});

test('media bytes changed by the probe callback invalidate the receipt',async t=>{
 const f=await fixture(t);
 await assert.rejects(inspectCaptions(f.root,f.input,{run:fakeRun({mutate:async args=>{if(args[0]==='-v')await fs.writeFile(path.join(f.root,'candidate.mp4'),'different media bytes');}})}),/Media changed during caption QC/);
});

