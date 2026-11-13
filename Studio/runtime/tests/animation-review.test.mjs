import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {parseReviewArgs,createReview} from '../scripts/animation-review.mjs';
const args=['--project','projects/test.json','--from','0','--to','1'];
test('bounded explicit interval and distinct in-range frames',()=>{
 const p=parseReviewArgs(args);assert.equal(p.times.length,8);assert(p.times.every(t=>t>=0&&t<1));assert.equal(new Set(p.times).size,8);
 for(const bad of [[],[...args,'--out','/tmp/overwrite'],[...args,'--to','2'],['--project','x','--from','0','--to','31'],['--project','x','--from','0','--to','.01']])assert.throws(()=>parseReviewArgs(bad));
});
async function fixture(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'jstudio-review-test-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));await fs.mkdir(path.join(dir,'app/projects'),{recursive:true});await fs.writeFile(path.join(dir,'app/projects/test.json'),JSON.stringify({shots:[{duration:6}]}));return dir;}
const render=async(_command,commandArgs)=>{const job=commandArgs.slice(1),out=job[job.indexOf('--out')+1];if(job[0]==='stills'){await fs.mkdir(out);const times=job[job.indexOf('--t')+1].split(',');await Promise.all(times.map((time,i)=>fs.writeFile(path.join(out,`${i}.png`),time)));}else await fs.writeFile(out,'fixture-artifact');};
test('unique revisions with hashes, metadata and pending creative review',async t=>{
 const dir=await fixture(t);const deps={render,decode:async()=>{},probe:async()=>({streams:[{codec_type:'video',width:1920,height:1080,nb_frames:'24',avg_frame_rate:'24/1',duration:'1'}],format:{duration:'1'}})};
 const first=await createReview(dir,args,{},deps),second=await createReview(dir,args,{},deps);assert.notEqual(first,second);
 const receipt=JSON.parse(await fs.readFile(path.join(first,'REVIEW.json')));assert.equal(receipt.status,'rendered');assert.equal(receipt.artifacts.length,10);assert.equal(receipt.audioPresent,false);assert.equal(receipt.review.visual,'not-reviewed');assert.equal(receipt.commands.length,3);assert.match(receipt.artifacts[0].sha256,/^[a-f0-9]{64}$/);
});
test('failed renderer preserves truthful receipt and partial evidence',async t=>{
 const dir=await fixture(t);await assert.rejects(createReview(dir,args,{}, {render:async()=>{throw Error('renderer failed');}}),/partial evidence retained/);
 const [revision]=await fs.readdir(path.join(dir,'reviews'));const receipt=JSON.parse(await fs.readFile(path.join(dir,'reviews',revision,'REVIEW.json')));assert.equal(receipt.status,'failed');assert.equal(receipt.review.approval,'not-requested');
});
test('rejects escaped config and excessive duration before outputs',async t=>{
 const dir=await fixture(t);await fs.writeFile(path.join(dir,'outside.json'),'{}');await assert.rejects(createReview(dir,['--project','../outside.json','--from','0','--to','1'],{}),/inside/);
 await assert.rejects(createReview(dir,['--project','projects/test.json','--from','0','--to','7'],{}),/duration/);await assert.rejects(fs.access(path.join(dir,'reviews')));
});
test('source drift cannot certify mixed-revision evidence',async t=>{
 const dir=await fixture(t);let count=0;
 await assert.rejects(createReview(dir,args,{}, {render:async(...params)=>{await render(...params);if(++count===2)await fs.writeFile(path.join(dir,'app/projects/test.json'),JSON.stringify({shots:[{duration:7}]}));},decode:async()=>{},probe:async()=>({streams:[{codec_type:'video',width:1920,height:1080,nb_frames:'24',avg_frame_rate:'24/1',duration:'1'}]})}),/source changed/);
});
test('bad metadata and decoding failures leave failed receipts',async t=>{
 const dir=await fixture(t);
 await assert.rejects(createReview(dir,args,{}, {render,decode:async()=>{},probe:async()=>({streams:[{codec_type:'video',width:10,height:10}]})}),/metadata/);
 await assert.rejects(createReview(dir,args,{}, {render,decode:async()=>{throw Error('corrupt frame');},probe:async()=>({streams:[{codec_type:'video',width:1920,height:1080,nb_frames:'24',avg_frame_rate:'24/1',duration:'1'}]})}),/corrupt frame/);
});
test('portrait review validates the requested canvas instead of landscape defaults',async t=>{
 const dir=await fixture(t);await fs.writeFile(path.join(dir,'app/projects/test.json'),JSON.stringify({canvas:{width:1080,height:1350},colorMode:'flat',shots:[{duration:6}]}));
 const result=await createReview(dir,args,{}, {render,decode:async()=>{},probe:async()=>({streams:[{codec_type:'video',width:1080,height:1350,nb_frames:'24',avg_frame_rate:'24/1',duration:'1'}]})});
 const receipt=JSON.parse(await fs.readFile(path.join(result,'REVIEW.json')));assert.deepEqual(receipt.canvas,{width:1080,height:1350});assert.equal(receipt.colorMode,'flat');
 await assert.rejects(createReview(dir,args,{}, {render,decode:async()=>{},probe:async()=>({streams:[{codec_type:'video',width:1920,height:1080,nb_frames:'24',avg_frame_rate:'24/1',duration:'1'}]})}),/metadata/);
});
