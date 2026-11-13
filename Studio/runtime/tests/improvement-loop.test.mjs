import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createImprovementPacket,recordImprovementFindings,decideImprovement,summarizeImprovementStatus,readImprovementRegistry} from '../scripts/improvement-loop.mjs';
import {unavailableRunInput,writeRunReport} from '../scripts/run-report.mjs';
import {writeReviewReceipt} from '../scripts/review-receipt.mjs';

function workspace(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'jstudio-improvement-')),home=path.join(root,'Studio'),runtime=path.join(home,'runtime');
 fs.mkdirSync(runtime,{recursive:true});fs.mkdirSync(path.join(root,'projects'));fs.mkdirSync(path.join(root,'profile'));
 fs.writeFileSync(path.join(home,'STUDIO.json'),JSON.stringify({runtime:'runtime',projects:'../projects',operations:'../profile'}));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return {root,home,runtime,projects:path.join(root,'projects'),operations:path.join(root,'profile')};
}
async function projectFixture(env,slug){
 const project=path.join(env.projects,slug);fs.mkdirSync(project,{recursive:true});
 fs.writeFileSync(path.join(project,'PROJECT.json'),JSON.stringify({}));fs.writeFileSync(path.join(project,'BRIEF.md'),'Brief stays local.');fs.writeFileSync(path.join(project,'STORYBOARD.md'),'Storyboard stays local.');
 fs.writeFileSync(path.join(project,'ANIMATION-TREATMENT.md'),'Visual world: paper geometry.');
 fs.mkdirSync(path.join(project,'evidence/gates/current'),{recursive:true});fs.mkdirSync(path.join(project,'evidence/runs/one'),{recursive:true});
 fs.writeFileSync(path.join(project,'evidence/gates/current/STAGE-CONTEXT.json'),JSON.stringify({snapshotId:'context-one',manifestHash:'b'.repeat(64),files:[]}));
 const media='reviews/candidate.mp4';fs.mkdirSync(path.join(project,'reviews'),{recursive:true});fs.writeFileSync(path.join(project,media),'candidate-bytes');
 const assessment={schemaVersion:2,media,durationSeconds:2,reviewer:'fixture',inspectionMethod:'sampled-frames',inspectedRanges:[{start:0,end:2}],displayTarget:{context:'Mobile player',minimumWidthPx:390},legibilityInspection:{status:'complete',inspectedWidthPx:390,checks:[{timeSeconds:1,text:'Main statement',result:'readable',evidence:'Inspected at 390px wide.'}]},playback:{status:'unavailable',reason:'Test only inspected samples'},listening:{status:'unavailable',reason:'No perceptual listening in fixture'},defects:[],qualityAssessment:{schemaVersion:1,dimensions:{
  storyClarity:{status:'unassessed',evidence:[],reason:'No playback'},originality:{status:'assessed',rating:4,evidence:['Subject-specific visual idea']},visualCraft:{status:'assessed',rating:3,evidence:['Sampled frame layout']},
  pacingRhythm:{status:'unassessed',evidence:[],reason:'No playback'},legibilityAccessibility:{status:'assessed',rating:4,evidence:['Phone-size text check']},sound:{status:'unassessed',evidence:[],reason:'No listening'},
  cohesion:{status:'unassessed',evidence:[],reason:'No playback'},factualAccuracy:{status:'assessed',rating:5,evidence:['Claim source checked']}
 }}};
 const review=await writeReviewReceipt(project,assessment),reviewRelative=path.relative(project,review.receiptPath).split(path.sep).join('/');
 const tokenPath=path.join(project,'evidence/gates/current/RUN-REPORT.json');const token=writeRunReport(unavailableRunInput({runId:`run-${slug}`,stage:'final-review',reason:'Fixture has no host token source'}),tokenPath);
 const packet=createImprovementPacket(project,{stage:'final',event:'presented-for-review',packetId:`packet-${slug}-0001`,snapshot:{next:[],ledger:{artifacts:[]}},review:{path:reviewRelative,receipt:review.receipt},tokenReport:token,commands:[{stage:'render',runId:'run-fail',operation:{status:'failed',error:'Fixture renderer failed'}}],receiptSummary:{commands:{total:1,byStatus:{failed:1}}},context:{path:'evidence/gates/current/STAGE-CONTEXT.json',snapshotId:'context-one',manifestHash:'b'.repeat(64),files:[]},operations:env.operations});
 return {project,packet,review,reviewRelative};
}
function reportWithFinding(env,fixture,{scope='studio',themeKey='mobile-safe-area',id=`finding-${scope}`}={}){
 const packet=JSON.parse(fs.readFileSync(path.join(fixture.project,fixture.packet.packetPath),'utf8'));
 const receipt=packet.sources.find(source=>source.kind==='review-receipt');
 const findings={schemaVersion:1,packet:{path:fixture.packet.packetPath,sha256:fixture.packet.packetSha256},findings:[{id,scope,category:'review-coverage',themeKey,priority:'P1',
  title:'Catch important text collisions at delivery scale',observation:'A text collision required a later film revision.',causeHypothesis:'Sparse sampling missed the crowded transition.',recommendedChange:'Add transition-aware phone-size samples to the review packet.',
  acceptance:['The review packet checks text transitions at phone width.','Evidence is bound to the exact candidate hash.'],confidence:'high',owner:'JStudio',evidence:[{path:receipt.path,sha256:receipt.sha256}]}]};
 const file=path.join(fixture.project,'evidence/improvement-packets',fixture.packet.packetPath.split('/')[2],'FINDINGS.json');
 fs.writeFileSync(file,JSON.stringify(findings,null,2)+'\n');return path.relative(fixture.project,file).split(path.sep).join('/');
}

test('gate packet binds exact media, review coverage, telemetry, failed commands and hashed sources',async t=>{
 const env=workspace(t),fixture=await projectFixture(env,'film-one'),packet=JSON.parse(fs.readFileSync(path.join(fixture.project,fixture.packet.packetPath),'utf8'));
 assert.equal(packet.candidate.mediaSha256,fixture.review.receipt.mediaSha256);assert.equal(packet.review.coverage.perceptualReviewComplete,false);
 assert.equal(packet.review.qualityAssessment.dimensions.sound.status,'unassessed');assert.equal(packet.tokenUsage.coverage.complete,false);
 assert.equal(packet.review.displayTarget.minimumWidthPx,390);assert.equal(packet.review.legibilityInspection.status,'complete');
 assert.equal(packet.commands.failures.length,1);assert(packet.sources.some(source=>source.path===fixture.reviewRelative));
 assert(packet.sources.some(source=>source.path==='ANIMATION-TREATMENT.md'&&source.kind==='animation-planning'));
 assert(fs.existsSync(path.join(fixture.project,fixture.packet.findingsTemplatePath)));
});

test('animation planning findings can cite the exact treatment hash bound by their review packet',async t=>{
 const env=workspace(t),fixture=await projectFixture(env,'film-planning'),packet=JSON.parse(fs.readFileSync(path.join(fixture.project,fixture.packet.packetPath),'utf8'));
 const treatment=packet.sources.find(source=>source.path==='ANIMATION-TREATMENT.md');assert.ok(treatment);
 const file=path.join(fixture.project,'evidence/improvement-packets',packet.packetId,'FINDINGS-PLANNING.json');
 fs.writeFileSync(file,JSON.stringify({schemaVersion:1,packet:{path:fixture.packet.packetPath,sha256:fixture.packet.packetSha256},findings:[{id:'treatment-source-capture',scope:'studio',category:'review-coverage',themeKey:'treatment-source-capture',priority:'P2',title:'Keep treatment readiness evidence hash-bound',observation:'A treatment readiness note needs an exact source reference.',causeHypothesis:'Planning checks and packet evidence should share the same artifact reference.',recommendedChange:'Capture the authored treatment hash in each review packet.',acceptance:['The finding references the exact treatment bytes.'],confidence:'high',owner:'JStudio',evidence:[{path:treatment.path,sha256:treatment.sha256}]}]},null,2));
 const result=recordImprovementFindings(env.runtime,'film-planning',path.relative(fixture.project,file));assert.equal(result.systemFindings,1);
});

test('records film-only findings locally and shared findings once per packet, then aggregates recurrence across projects',async t=>{
 const env=workspace(t),first=await projectFixture(env,'film-one');
 let findingsPath=reportWithFinding(env,first,{scope:'film',id:'film-layout-fix'});
 const filmResult=recordImprovementFindings(env.runtime,'film-one',findingsPath);
 assert.equal(filmResult.filmFindings,1);assert.equal(filmResult.systemFindings,0);assert.equal(readImprovementRegistry(env.operations).issues.length,0);

 const sharedPath=reportWithFinding(env,first,{id:'phone-layout'}),shared=recordImprovementFindings(env.runtime,'film-one',sharedPath);
 assert.equal(shared.newIssues.length,1);assert.equal(summarizeImprovementStatus(env.operations).coverage.runs,1);
 recordImprovementFindings(env.runtime,'film-one',sharedPath);
 let registry=readImprovementRegistry(env.operations);assert.equal(registry.runs.length,1);assert.equal(registry.issues[0].occurrences,1);

 const second=await projectFixture(env,'film-two'),secondPath=reportWithFinding(env,second,{id:'mobile-caption-collision'}),secondResult=recordImprovementFindings(env.runtime,'film-two',secondPath);
 assert.deepEqual(secondResult.recurringIssues,[registry.issues[0].id]);
 registry=readImprovementRegistry(env.operations);assert.equal(registry.issues[0].occurrences,2);
 assert.equal(registry.issues[0].sources[0].findingsPath,undefined); // Shared metadata does not expose project evidence paths.
 assert.equal(registry.issues[0].sources[0].projectSlug,undefined);
 assert.equal(registry.runs[0].projectSlug,undefined);
 assert.equal(registry.issues[0].observations[0].projectSlug,undefined);
 assert.equal(summarizeImprovementStatus(env.operations).recurringOpenCount,1);
});

test('an implemented issue requires validation evidence and recurrence reopens it',async t=>{
 const env=workspace(t),first=await projectFixture(env,'film-one'),findingsPath=reportWithFinding(env,first);
 const recorded=recordImprovementFindings(env.runtime,'film-one',findingsPath),issueId=recorded.newIssues[0];
 assert.throws(()=>decideImprovement(env.runtime,issueId,'implemented','Fixed without evidence'),/requires --evidence/);
 fs.mkdirSync(path.join(env.root,'validation'),{recursive:true});fs.writeFileSync(path.join(env.root,'validation/test-report.json'),'{"tests":12,"passed":12}');
 decideImprovement(env.runtime,issueId,'accepted','Prioritize phone-size regression coverage.');
 decideImprovement(env.runtime,issueId,'implemented','Added regression coverage.', 'validation/test-report.json');
 const second=await projectFixture(env,'film-two'),secondPath=reportWithFinding(env,second);
 recordImprovementFindings(env.runtime,'film-two',secondPath);
 const issue=readImprovementRegistry(env.operations).issues[0];assert.equal(issue.state,'proposed');assert.equal(issue.postDecisionRecurrences,1);assert.equal(issue.occurrences,2);
});

test('rejects findings that cite a changed packet source before changing shared state',async t=>{
 const env=workspace(t),fixture=await projectFixture(env,'film-one'),relative=reportWithFinding(env,fixture);
 const file=path.join(fixture.project,relative),findings=JSON.parse(fs.readFileSync(file));findings.findings[0].evidence[0].sha256='f'.repeat(64);fs.writeFileSync(file,JSON.stringify(findings));
 assert.throws(()=>recordImprovementFindings(env.runtime,'film-one',relative),/not an exact source/);
 assert.equal(fs.existsSync(path.join(env.operations,'STUDIO-IMPROVEMENTS.json')),false);
});

test('requires every packet source, including the encoded candidate, to remain byte-exact when findings are recorded',async t=>{
 const env=workspace(t),fixture=await projectFixture(env,'film-one'),packet=JSON.parse(fs.readFileSync(path.join(fixture.project,fixture.packet.packetPath),'utf8'));
 const file=path.join(fixture.project,'evidence/improvement-packets',packet.packetId,'FINDINGS.json');
 fs.writeFileSync(file,JSON.stringify({schemaVersion:1,packet:{path:fixture.packet.packetPath,sha256:fixture.packet.packetSha256},findings:[]}));
 fs.appendFileSync(path.join(fixture.project,packet.candidate.media),'changed');
 assert.throws(()=>recordImprovementFindings(env.runtime,'film-one',path.relative(fixture.project,file)),/Packet evidence changed/);
 assert.equal(fs.existsSync(path.join(env.operations,'STUDIO-IMPROVEMENTS.json')),false);
});

test('empty findings records quality and telemetry coverage without inventing scores',async t=>{
 const env=workspace(t),fixture=await projectFixture(env,'film-one'),packet=JSON.parse(fs.readFileSync(path.join(fixture.project,fixture.packet.packetPath),'utf8'));
 const file=path.join(fixture.project,'evidence/improvement-packets',packet.packetId,'FINDINGS.json');fs.writeFileSync(file,JSON.stringify({schemaVersion:1,packet:{path:fixture.packet.packetPath,sha256:fixture.packet.packetSha256},findings:[]}));
 const result=recordImprovementFindings(env.runtime,'film-one',path.relative(fixture.project,file).split(path.sep).join('/'));
 const status=summarizeImprovementStatus(env.operations);assert.equal(result.runRecorded,true);assert.equal(status.coverage.runs,1);assert.equal(status.coverage.completeTokenRuns,0);assert.equal(status.qualityTrend.originality,undefined);
});
