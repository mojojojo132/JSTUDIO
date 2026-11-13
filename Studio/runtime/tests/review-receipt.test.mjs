import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import crypto from 'node:crypto';
import path from 'node:path';
import {writeReviewReceipt,verifyReviewReceipt} from '../scripts/review-receipt.mjs';
async function fixture(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'review-receipt-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));await fs.writeFile(path.join(root,'render.mp4'),'fixture');await fs.writeFile(path.join(root,'human.txt'),'I watched the entire fixture. I listened to its sound.');return root;}
const input=()=>({schemaVersion:2,media:'render.mp4',durationSeconds:30,reviewer:'fixture reviewer',inspectedRanges:[{start:0,end:30}],displayTarget:{context:'Mobile video player',minimumWidthPx:390},legibilityInspection:{status:'complete',inspectedWidthPx:390,checks:[{timeSeconds:15,text:'Central claim',result:'readable',evidence:'Inspected the encoded frame at 390px wide.'}]},playback:{status:'performed',attestation:{confirmed:true,reviewer:'Synthetic test human',mediaSha256:crypto.createHash('sha256').update('fixture').digest('hex'),source:'human.txt',quote:'I watched the entire fixture.'}},listening:{status:'not-applicable',reason:'Silent fixture'},defects:[]});
test('receipt binds exact bytes, preserves earlier reviews, and never grants approval',async t=>{const root=await fixture(t),a=await writeReviewReceipt(root,input()),b=await writeReviewReceipt(root,input());assert.notEqual(a.receiptPath,b.receiptPath);assert.equal((await verifyReviewReceipt(root,a.receiptPath,{requireComplete:true})).approval,false);await fs.writeFile(path.join(root,'render.mp4'),'revision');await assert.rejects(()=>verifyReviewReceipt(root,a.receiptPath),/latest render/);});
test('partial inspection and unavailable playback are recorded honestly and fail full review',async t=>{const root=await fixture(t),data=input();data.inspectedRanges=[{start:0,end:2},{start:28,end:30}];data.legibilityInspection.checks[0].timeSeconds=1;data.playback={status:'unavailable',reason:'Host has no playback surface'};const a=await writeReviewReceipt(root,data);assert.equal(a.receipt.coverageComplete,false);await assert.rejects(()=>verifyReviewReceipt(root,a.receiptPath,{requireComplete:true}),/incomplete/);});
test('invalid ranges and missing capability reasons fail without writing receipts',async t=>{const root=await fixture(t);for(const patch of [{inspectedRanges:[{start:0,end:31}]},{playback:{status:'unavailable'}},{media:'../outside'}])await assert.rejects(()=>writeReviewReceipt(root,{...input(),...patch}));});
test('legibility evidence must be bound to the declared minimum display width and inspected frame range',async t=>{
 const root=await fixture(t),data=input();
 for(const patch of [
  {displayTarget:{context:'Phone',minimumWidthPx:390},legibilityInspection:{...data.legibilityInspection,inspectedWidthPx:960}},
  {legibilityInspection:{...data.legibilityInspection,checks:[{...data.legibilityInspection.checks[0],timeSeconds:31}]}},
  {legibilityInspection:{status:'partial',inspectedWidthPx:390,checks:[],reason:'Only one frame was checked.'}}
 ])await assert.rejects(()=>writeReviewReceipt(root,{...data,...patch}),/minimum display width|inspectedRanges|Partial|Invalid legibilityInspection/);
});
test('assessed legibility requires complete target-width checks while unavailable review stays explicit',async t=>{
 const root=await fixture(t),data=input();data.legibilityInspection={status:'partial',inspectedWidthPx:390,checks:[{...data.legibilityInspection.checks[0]}],reason:'A few required labels remain unchecked.'};
 data.qualityAssessment={schemaVersion:1,dimensions:{storyClarity:{status:'unassessed',evidence:[],reason:'No playback'},originality:{status:'assessed',rating:4,evidence:['A clear idea']},visualCraft:{status:'assessed',rating:3,evidence:['Samples']},pacingRhythm:{status:'unassessed',evidence:[],reason:'No playback'},legibilityAccessibility:{status:'assessed',rating:4,evidence:['Text at target width']},sound:{status:'unassessed',evidence:[],reason:'No listening'},cohesion:{status:'unassessed',evidence:[],reason:'No playback'},factualAccuracy:{status:'assessed',rating:4,evidence:['Source check']}}};
 await assert.rejects(()=>writeReviewReceipt(root,data),/legibilityAccessibility requires complete checks/);
 data.qualityAssessment.dimensions.legibilityAccessibility={status:'unassessed',evidence:[],reason:'Some required copy was not checked at the target width.'};
 const receipt=await writeReviewReceipt(root,data);assert.equal(receipt.receipt.legibilityInspection.status,'partial');
});
test('new receipts preserve target-width checks and older v1 receipts remain readable',async t=>{
 const root=await fixture(t),saved=await writeReviewReceipt(root,input());
 assert.equal(saved.receipt.schemaVersion,2);assert.equal(saved.receipt.displayTarget.minimumWidthPx,390);assert.equal(saved.receipt.legibilityInspection.checks[0].result,'readable');
 const legacy={...saved.receipt,schemaVersion:1};delete legacy.displayTarget;delete legacy.legibilityInspection;
 const legacyPath=path.join(root,'legacy.json');await fs.writeFile(legacyPath,JSON.stringify(legacy));
 assert.equal((await verifyReviewReceipt(root,legacyPath)).schemaVersion,1);
});
test('perceptual completion includes target-width legibility and accepts text-free work as not-applicable',async t=>{
 const root=await fixture(t),data=input();data.legibilityInspection={status:'unavailable',inspectedWidthPx:null,checks:[],reason:'The target-size frame check was unavailable.'};
 let saved=await writeReviewReceipt(root,data);assert.equal(saved.receipt.continuousPlaybackComplete,true);assert.equal(saved.receipt.legibilityComplete,false);assert.equal(saved.receipt.perceptualReviewComplete,false);
 data.legibilityInspection={status:'not-applicable',inspectedWidthPx:null,checks:[],reason:'This cut contains no on-screen or caption text.'};
 saved=await writeReviewReceipt(root,data);assert.equal(saved.receipt.legibilityComplete,true);assert.equal(saved.receipt.perceptualReviewComplete,true);
});
test('a receipt cannot be reused for a different render path',async t=>{const root=await fixture(t),a=await writeReviewReceipt(root,input());await assert.rejects(()=>verifyReviewReceipt(root,a.receiptPath,{mediaPath:'other.mp4'}),/different media/);});

test('measured duration mismatch fails; capability limits remain visible without claiming playback',async t=>{const root=await fixture(t),data=input();data.playback={status:'unavailable',reason:'No playback capability'};const a=await writeReviewReceipt(root,data);assert.equal((await verifyReviewReceipt(root,a.receiptPath,{expectedDuration:30})).perceptualReviewComplete,false);await assert.rejects(()=>verifyReviewReceipt(root,a.receiptPath,{requireComplete:true}),/incomplete/);await assert.rejects(()=>verifyReviewReceipt(root,a.receiptPath,{expectedDuration:60}),/measured media duration/);});

test('full sampled range is distinct from continuous review',async t=>{const root=await fixture(t),data=input();data.inspectionMethod='sampled-frames';data.playback={status:'unavailable',reason:'Only frames inspected'};const a=await writeReviewReceipt(root,data);assert.equal(a.receipt.declaredRangeCoverageComplete,true);assert.equal(a.receipt.continuousPlaybackComplete,false);assert.equal(a.receipt.perceptualReviewComplete,false);await assert.rejects(()=>writeReviewReceipt(root,{...data,playback:{status:'performed'}}),/Sampled/);});
test('resolved defects need a recheck tied to this exact media',async t=>{const root=await fixture(t),data=input(),first=await writeReviewReceipt(root,data);data.defects=[{severity:'medium',description:'Overflow',status:'resolved'}];await assert.rejects(()=>writeReviewReceipt(root,data),/verification/);data.defects[0].verification={mediaSha256:'a'.repeat(64),note:'Inspected corrected frame'};await assert.rejects(()=>writeReviewReceipt(root,data),/different media hash/);data.defects[0].verification.mediaSha256=first.receipt.mediaSha256;const a=await writeReviewReceipt(root,data);assert.equal((await verifyReviewReceipt(root,a.receiptPath)).defects[0].status,'resolved');});

test('performed requires explicit source-backed hash-bound evidence, never generic approval',async t=>{const root=await fixture(t);for(const attestation of [undefined,{...input().playback.attestation,quote:'Approved'},{...input().playback.attestation,mediaSha256:'f'.repeat(64)},{...input().playback.attestation,quote:'I watched a different entire video.'}])await assert.rejects(()=>writeReviewReceipt(root,{...input(),playback:{status:'performed',attestation}}));const a=await writeReviewReceipt(root,input());await fs.appendFile(path.join(root,'human.txt'),' appended decision');await verifyReviewReceipt(root,a.receiptPath);await fs.writeFile(path.join(root,'human.txt'),'I watched the entire fixture. I listened to changed sound.');await assert.rejects(()=>verifyReviewReceipt(root,a.receiptPath),/source changed|truncated/);});

test('negation and partial-review quotes cannot establish full playback or listening',async t=>{const root=await fixture(t);for(const quote of ['I have not watched the entire fixture.','I never watched the full fixture.','I watched the first two seconds.','I listened to part of the soundtrack.']){await fs.writeFile(path.join(root,'human.txt'),quote);const data=input(),key=quote.includes('listened')?'listening':'playback';data[key]={status:'performed',attestation:{...data.playback.attestation,quote}};await assert.rejects(()=>writeReviewReceipt(root,data),/quote/);}});

function scorecard(){
 const dimensions={};
 for(const name of ['storyClarity','originality','visualCraft','pacingRhythm','legibilityAccessibility','sound','cohesion','factualAccuracy'])dimensions[name]={status:'assessed',rating:4,evidence:[`${name} evidence from the complete fixture`]};
 return {schemaVersion:1,dimensions,strengths:[],opportunities:[]};
}
test('quality scorecard persists with an exact review and requires evidence for each rating',async t=>{
 const root=await fixture(t),data=input();await fs.writeFile(path.join(root,'human.txt'),'I watched the entire fixture. I listened to the entire fixture.');data.listening={status:'performed',attestation:{...data.playback.attestation,quote:'I listened to the entire fixture.'}};data.qualityAssessment=scorecard();
 const receipt=await writeReviewReceipt(root,data);assert.equal(receipt.receipt.qualityAssessment.dimensions.storyClarity.rating,4);
 assert.equal((await verifyReviewReceipt(root,receipt.receiptPath,{requireComplete:true})).qualityAssessment.dimensions.sound.status,'assessed');
 const weak=input();weak.qualityAssessment=scorecard();weak.qualityAssessment.dimensions.visualCraft.evidence=[];
 await assert.rejects(()=>writeReviewReceipt(root,weak),/rating and evidence/);
});
test('quality scorecard will not rate whole-film rhythm or sound without actual playback/listening',async t=>{
 const root=await fixture(t),data=input();data.playback={status:'unavailable',reason:'Only sampled frames were inspected'};data.qualityAssessment=scorecard();
 await assert.rejects(()=>writeReviewReceipt(root,data),/storyClarity requires performed playback/);
 for(const name of ['storyClarity','pacingRhythm','cohesion'])data.qualityAssessment.dimensions[name]={status:'unassessed',evidence:[],reason:'Sampled frames only'};
 data.qualityAssessment.dimensions.sound={status:'unassessed',evidence:[],reason:'No perceptual listening'};
 const receipt=await writeReviewReceipt(root,data);assert.equal(receipt.receipt.qualityAssessment.dimensions.sound.rating,undefined);
});
