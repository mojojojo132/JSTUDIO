import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {inspectEncodedCandidate} from '../scripts/encoded-qc.mjs';

const probe={format:{duration:'2.5'},streams:[
 {codec_type:'video',codec_name:'h264',width:1920,height:1080,avg_frame_rate:'24/1'},
 {codec_type:'audio',codec_name:'aac',sample_rate:'48000',channels:2}
]};
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'encoded-qc-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.writeFile(path.join(root,'candidate.mp4'),'fixture-bytes');
 return root;
}
function successfulRun(calls=[]){return async(command,args)=>{
 calls.push({command,args});
 if(command==='probe')return {stdout:JSON.stringify(probe),stderr:''};
 return {stdout:'',stderr:''};
};}

test('records exact candidate hash, expectations, all-stream decode, and no approval',async t=>{
 const root=await fixture(t),calls=[];
 const result=await inspectEncodedCandidate(root,{media:'candidate.mp4',expect:{streams:['video','audio'],width:1920,height:1080,fps:24,duration:2.5}},{ffprobe:'probe',ffmpeg:'decode',run:successfulRun(calls)});
 assert.equal(result.receipt.status,'passed');
 assert.equal(result.receipt.kind,'encoded-candidate-qc');
 assert.equal(result.receipt.approval,false);
 assert.equal(result.receipt.candidate.sha256.length,64);
 assert.equal(result.receipt.checks.find(c=>c.check==='full-decode').status,'pass');
 const decode=calls.find(c=>c.command==='decode');
 assert.ok(decode.args.includes('0:v?'));
 assert.ok(decode.args.includes('0:a?'));
 assert.equal(decode.args.includes('0:v:0'),false);
 assert.ok(result.receiptPath.startsWith(path.join(await fs.realpath(root),'evidence','encoded-qc')));
});

test('writes an actionable failure receipt for expectation and decode failures',async t=>{
 const root=await fixture(t),run=async(command,args)=>{
  if(command==='probe')return {stdout:JSON.stringify(probe)};
  throw Error('corrupt packet at timestamp 1.1');
 };
 const result=await inspectEncodedCandidate(root,{media:'candidate.mp4',expect:{width:1280,streams:['audio','subtitle']}},{ffprobe:'probe',ffmpeg:'decode',run});
 assert.equal(result.receipt.status,'failed');
 assert.equal(result.receipt.fullDecode,false);
 assert.equal(result.receipt.decodeAttempted,true);
 assert.match(result.receipt.checks.find(c=>c.check==='width').message,/Expected width 1280, found 1920/);
 assert.match(result.receipt.checks.find(c=>c.check==='stream:subtitle').message,/stream mapping/);
 assert.match(result.receipt.checks.find(c=>c.check==='full-decode').message,/corrupt packet/);
 assert.ok(await fs.stat(result.receiptPath));
});

test('black, freeze, and silence detections are advisory, including legitimate intervals',async t=>{
 const root=await fixture(t),run=async(command,args)=>{
  if(command==='probe')return {stdout:JSON.stringify(probe)};
  const filter=args.find(value=>String(value).startsWith('blackdetect=')||String(value).startsWith('freezedetect=')||String(value).startsWith('silencedetect='));
  const stderr=String(filter).startsWith('blackdetect=')?'[blackdetect @ 0x1] black_start:0 black_end:1 black_duration:1':String(filter).startsWith('freezedetect=')?'[Parsed_freezedetect_0 @ 0x1] freeze_start: 2.0\n[Parsed_freezedetect_0 @ 0x1] freeze_end: 4.0\n[Parsed_freezedetect_0 @ 0x1] freeze_duration: 2.0':'[silencedetect @ 0x1] silence_start: 0.0\n[silencedetect @ 0x1] silence_end: 2.0 | silence_duration: 2.0';
  return {stdout:'',stderr};
 };
 const result=await inspectEncodedCandidate(root,{media:'candidate.mp4',analyze:{blackFrames:true,freezes:true,silence:true}},{ffprobe:'probe',ffmpeg:'decode',run});
 assert.equal(result.receipt.status,'passed');
 assert.deepEqual(result.receipt.advisories.map(a=>a.status),['advisory','advisory','advisory']);
 assert.deepEqual(result.receipt.advisories.map(a=>a.intervals.length),[1,1,1]);
 assert.deepEqual(result.receipt.advisories[1].intervals[0],{startSeconds:2,endSeconds:4,durationSeconds:2});
 assert.deepEqual(result.receipt.advisories[2].intervals[0],{startSeconds:0,endSeconds:2,durationSeconds:2});
 assert.ok(result.receipt.limitations.some(line=>line.includes('source rights')));
});

test('rejects outside paths, symlinked media, and empty files before execution',async t=>{
 const root=await fixture(t),run=()=>{throw Error('must not execute');};
 await assert.rejects(inspectEncodedCandidate(root,{media:'../outside.mp4'},{run}),/inside the project/);
 await fs.symlink(path.join(root,'candidate.mp4'),path.join(root,'linked.mp4'));
 await assert.rejects(inspectEncodedCandidate(root,{media:'linked.mp4'},{run}),/cannot contain symlinks/);
 await fs.writeFile(path.join(root,'empty.mp4'),'');
 await assert.rejects(inspectEncodedCandidate(root,{media:'empty.mp4'},{run}),/empty/);
});

test('rejects absolute paths and malformed expectations before invoking media tools',async t=>{
 const root=await fixture(t),run=()=>{throw Error('media tools must not execute');};
 await assert.rejects(inspectEncodedCandidate(root,{media:path.join(root,'candidate.mp4')},{run}),/project-relative/);
 await assert.rejects(inspectEncodedCandidate(root,{media:'candidate.mp4',expect:{width:0}},{run}),/positive integer/);
 await assert.rejects(inspectEncodedCandidate(root,{media:'candidate.mp4',expect:{duration:2,durationTolerance:-1}},{run}),/non-negative/);
 await assert.rejects(inspectEncodedCandidate(root,{media:'candidate.mp4',analyze:{blackFrames:{pixelThreshold:1.1}}},{run}),/between 0 and 1/);
});

test('reports enabled heuristics as not applicable when their stream is absent',async t=>{
 const root=await fixture(t),audioOnly={format:{duration:'2'},streams:[{codec_type:'audio'}]},run=async command=>command==='probe'?{stdout:JSON.stringify(audioOnly)}:{stdout:'',stderr:''};
 const result=await inspectEncodedCandidate(root,{media:'candidate.mp4',analyze:{freezes:true,silence:true}},{ffprobe:'probe',ffmpeg:'decode',run});
 assert.equal(result.receipt.advisories[0].status,'not-applicable');
 assert.equal(result.receipt.advisories[1].status,'advisory');
});

test('rejects a candidate modified during measurement',async t=>{
 const root=await fixture(t),run=async(command)=>{
  if(command==='probe'){await fs.writeFile(path.join(root,'candidate.mp4'),'changed-bytes');return {stdout:JSON.stringify(probe)};}
  return {stdout:'',stderr:''};
 };
 await assert.rejects(inspectEncodedCandidate(root,{media:'candidate.mp4'},{ffprobe:'probe',ffmpeg:'decode',run}),/changed during measurement/);
});

test('advisory configuration failure does not downgrade decode but reports unavailable analysis',async t=>{
 const root=await fixture(t),run=async(command,args)=>{
  if(command==='probe')return {stdout:JSON.stringify(probe)};
  if(args.some(value=>String(value).startsWith('blackdetect=')))throw Error('filter unavailable');
  return {stdout:'',stderr:''};
 };
 const result=await inspectEncodedCandidate(root,{media:'candidate.mp4',analyze:{blackFrames:true}},{ffprobe:'probe',ffmpeg:'decode',run});
 assert.equal(result.receipt.status,'passed');
 assert.equal(result.receipt.advisories[0].status,'unavailable');
});
