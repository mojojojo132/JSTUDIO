import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {createReviewWorkbench,startReviewWorkbench} from '../scripts/review-workbench.mjs';
import {verifyReviewReceipt} from '../scripts/review-receipt.mjs';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function fixture(t){
 const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'studio-workbench-test-')));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.writeFile(path.join(root,'candidate.mp4'),'synthetic-encoded-fixture');
 const inspect=async(project,input)=>{const media=await fs.readFile(path.join(project,input.media));const receipt={kind:'encoded-candidate-qc',candidate:{path:input.media,sha256:hash(media),bytes:media.length},status:'passed',approval:false,measured:{durationSeconds:2,streams:[{type:'video',width:160,height:90},{type:'audio'}]}};const file=path.join(root,'QC.json');await fs.writeFile(file,JSON.stringify(receipt));return {receiptPath:file,receipt};};
 const result=await createReviewWorkbench(root,{media:'candidate.mp4',displayTarget:{context:'Engineering fixture player',minimumWidthPx:320}},{inspect});
 return {root,packet:result.packet,packetName:path.relative(root,result.packetPath).split(path.sep).join('/'),inspect};
}
async function opened(t,f){const session=await startReviewWorkbench(f.root,f.packetName);t.after(()=>session.close());const page=await (await fetch(session.url)).text(),token=page.match(/"csrfToken":"([a-f0-9]+)"/)[1];return {...session,page,token};}
const input=()=>({reviewer:'Synthetic engineering fixture',inspectedRanges:[],inspectionMethod:'unspecified',legibilityInspection:{status:'unavailable',inspectedWidthPx:null,checks:[],reason:'Fixture; no perceptual review performed'},defects:[],notes:'Synthetic test only; never human or film acceptance.'});
function post(s,body,token=s.token){return fetch(s.url+'/save',{method:'POST',headers:{'Content-Type':'application/json','X-Review-Token':token},body:JSON.stringify(body)});}

test('review packet is bound to candidate and QC without approval or perception',async t=>{
 const f=await fixture(t);assert.equal(f.packet.approval,false);assert.equal(f.packet.mediaSha256,hash(await fs.readFile(path.join(f.root,'candidate.mp4'))));assert.equal(f.packet.videoWidth,160);
 assert.match(f.packet.notice,/never establish/);
 await assert.rejects(createReviewWorkbench(f.root,{media:path.join(f.root,'candidate.mp4'),displayTarget:f.packet.displayTarget},{inspect:f.inspect}),/project-relative/);
 await fs.symlink(path.join(f.root,'candidate.mp4'),path.join(f.root,'linked.mp4'));
 await assert.rejects(createReviewWorkbench(f.root,{media:'linked.mp4',displayTarget:f.packet.displayTarget},{inspect:f.inspect}),/symlink/);
});

test('loopback server serves exact byte ranges, rejects traversal and invalid sessions',async t=>{
 const f=await fixture(t),s=await opened(t,f);
 assert.match(s.page,/Review Workbench/);assert.match(s.page,/No inspected ranges recorded/);
 const response=await fetch(s.url+'/media',{headers:{Range:'bytes=0-8'}});assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),`bytes 0-8/${f.packet.mediaBytes}`);assert.equal(await response.text(),'synthetic');
 assert.equal((await fetch(s.url+'/media',{headers:{Range:'bytes=999-'}})).status,416);
 assert.equal((await fetch(s.url+'/anything')).status,404);
 assert.equal((await post(s,input(),'wrong-token')).status,403);
 const hostile=await fetch(s.url+'/save',{method:'POST',headers:{'Content-Type':'application/json','X-Review-Token':s.token,Origin:'https://unrelated.example'},body:JSON.stringify(input())});assert.equal(hostile.status,403);
});

test('saving absent declarations preserves incomplete review and creates immutable evidence',async t=>{
 const f=await fixture(t),s=await opened(t,f);await fetch(s.url+'/media').then(r=>r.text());const response=await post(s,input());assert.equal(response.status,200);const saved=await response.json();
 assert.equal(saved.receipt.approval,false);assert.equal(saved.receipt.perceptualReviewComplete,false);assert.equal(saved.receipt.playback.status,'not-performed');assert.equal(saved.receipt.listening.status,'not-performed');
 assert.equal(saved.assessment.media,f.packet.media);assert.ok(await fs.readFile(path.join(f.root,saved.assessmentPath)));
 const second=await (await post(s,input())).json();assert.notEqual(second.receiptPath,saved.receiptPath);
 const verified=await verifyReviewReceipt(f.root,saved.receiptPath);assert.equal(verified.approval,false);
});

test('explicit fixture declarations are separately bound and never approve the film',async t=>{
 const f=await fixture(t),s=await opened(t,f),body={...input(),inspectedRanges:[{start:0,end:2}],inspectionMethod:'continuous-playback',playbackQuote:'I watched the entire candidate from start to finish.',listeningQuote:'I listened to the entire candidate from start to finish.',legibilityInspection:{status:'not-applicable',inspectedWidthPx:null,checks:[],reason:'Synthetic textless fixture'}};
 const response=await post(s,body);assert.equal(response.status,200);const result=await response.json();assert.equal(result.receipt.perceptualReviewComplete,true);assert.equal(result.receipt.approval,false);
 assert.equal((await verifyReviewReceipt(f.root,result.receiptPath,{requireComplete:true})).mediaSha256,f.packet.mediaSha256);
});

test('source replacement invalidates serving and saving even when replaced with identical bytes',async t=>{
 const f=await fixture(t),s=await opened(t,f);await fetch(s.url+'/media').then(r=>r.text());
 const media=path.join(f.root,'candidate.mp4'),bytes=await fs.readFile(media);await fs.rename(media,media+'.old');await fs.writeFile(media,bytes);
 assert.equal((await fetch(s.url+'/media')).status,409);assert.equal((await post(s,input())).status,409);
});

test('unrelated QC evidence cannot be presented as this candidate passing QC',async t=>{
 const f=await fixture(t),qc=JSON.parse(await fs.readFile(path.join(f.root,'QC.json')));qc.candidate.sha256='0'.repeat(64);const bytes=Buffer.from(JSON.stringify(qc));await fs.writeFile(path.join(f.root,'QC.json'),bytes);f.packet.qc.sha256=hash(bytes);await fs.writeFile(path.join(f.root,f.packetName),JSON.stringify(f.packet));
 await assert.rejects(startReviewWorkbench(f.root,f.packetName),/does not identify/);
});

test('browser-style cancelled media requests do not invalidate later review saves',async t=>{
 const f=await fixture(t);await fs.writeFile(path.join(f.root,'candidate.mp4'),Buffer.alloc(4*1024*1024,42));
 const bundle=await createReviewWorkbench(f.root,{media:'candidate.mp4',displayTarget:f.packet.displayTarget},{inspect:f.inspect});f.packetName=path.relative(f.root,bundle.packetPath).split(path.sep).join('/');
 const s=await opened(t,f),response=await fetch(s.url+'/media');const reader=response.body.getReader();await reader.read();await reader.cancel();
 const saved=await post(s,input());assert.equal(saved.status,200);assert.equal((await saved.json()).receipt.approval,false);
});
