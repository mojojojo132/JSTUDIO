import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {workflow,resolveProject} from '../scripts/workflow.mjs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolveWorkspace} from '../scripts/workspace.mjs';
const runtime=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourceTool=path.resolve(runtime,'../director/tools/animation-handoff.mjs');
const tool=fs.existsSync(sourceTool)?sourceTool:path.join(resolveWorkspace(runtime).skills,'director/tools/animation-handoff.mjs');
const handoff=await import(pathToFileURL(tool));
import {finishRender} from '../scripts/finishing.mjs';
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'studio-workflow-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.writeFileSync(path.join(root,'STUDIO.json'),JSON.stringify({projects:'content',runtime:'runtime'}));
 const project=path.join(root,'content/demo');fs.mkdirSync(path.join(project,'edit'),{recursive:true});
 fs.writeFileSync(path.join(project,'PROJECT.json'),JSON.stringify({nativeProject:'edit'}));
 fs.writeFileSync(path.join(project,'STORYBOARD.md'),'The story');fs.writeFileSync(path.join(project,'edit/index.html'),'<main></main>');
 return {root,project,loadTools:async()=>handoff};
}
test('router resolves configured project/native paths and rejects traversal/symlinks',t=>{
 const {root,project}=fixture(t);assert.equal(resolveProject(root,'demo').native,path.join(project,'edit'));
 assert.throws(()=>resolveProject(root,'../demo'),/slug/);
 fs.symlinkSync(project,path.join(root,'content/alias'));assert.throws(()=>resolveProject(root,'alias'),/Symlink/);
});
test('unknown commands show valid workflow usage before trying to resolve a project',async t=>{
 const {root}=fixture(t);
 await assert.rejects(workflow(root,'../missing','workflow-help'),/Unknown workflow command.*status.*Examples:/s);
 const script=path.join(runtime,'scripts/workflow.mjs');
 const result=spawnSync(process.execPath,[script,'missing','workflow-help'],{encoding:'utf8'});
 assert.equal(result.status,2);assert.equal(result.stdout,'');assert.match(result.stderr,/Unknown workflow command.*descriptor.*Examples:/s);
});
test('route help flags print usage before opening any project-relative file',t=>{
 const script=path.join(runtime,'scripts/workflow.mjs');
 for(const command of ['review','status']){
  const result=spawnSync(process.execPath,[script,'missing',command,'--help'],{encoding:'utf8'});
  assert.equal(result.status,0,`${command}: ${result.stderr}`);assert.equal(result.stderr,'');assert.match(result.stdout,new RegExp(`Usage: npm run workflow -- <project-slug> ${command}`));
 }
 const descriptor=spawnSync(process.execPath,[script,'missing','descriptor','--help'],{encoding:'utf8'});
 assert.equal(descriptor.status,0);assert.match(descriptor.stdout,/engineRevision/);assert.match(descriptor.stdout,/renderSettings/);assert.match(descriptor.stdout,/\.render\.json/);
 const sample=descriptor.stdout.match(/Example:\n(\{[\s\S]*?\n\})/);assert.ok(sample);const settings=JSON.parse(sample[1]);assert.equal(typeof settings.engineRevision,'string');assert.equal(typeof settings.renderSettings,'object');assert.equal(typeof settings.provenance,'string');assert.deepEqual(settings.files,[]);
});
test('workflow records real evidence only; status exposes missing approvals and changed sources',async t=>{
 const {root,project,loadTools}=fixture(t),opts={loadTools};
 assert.equal((await workflow(root,'demo','status',[],opts)).ledger,null);
 await workflow(root,'demo','init',['synthetic-test'],opts);
 fs.writeFileSync(path.join(project,'descriptor.json'),JSON.stringify({files:['STORYBOARD.md']}));
 const board=await workflow(root,'demo','register',['storyboard','main','descriptor.json'],opts);
 assert.equal((await workflow(root,'demo','status',[],opts)).ledger.artifacts[0].approved,false);
 fs.writeFileSync(path.join(project,'approval.json'),JSON.stringify({reviewer:'fixture',statement:'Synthetic unit-test evidence only',fingerprint:'wrong'}));
 await assert.rejects(workflow(root,'demo','approve',['storyboard','main','approval.json'],opts),/fingerprint/);
 fs.writeFileSync(path.join(project,'approval.json'),JSON.stringify({reviewer:'fixture',statement:'Synthetic unit-test evidence only',fingerprint:board.fingerprint}));
 await workflow(root,'demo','approve',['storyboard','main','approval.json'],opts);
 fs.appendFileSync(path.join(project,'STORYBOARD.md'),' changed');
 assert.equal((await workflow(root,'demo','status',[],opts)).ledger.artifacts[0].current,false);
});
test('existing lowercase ledger is reused, not duplicated',async t=>{
 const {root,project,loadTools}=fixture(t);handoff.init(path.join(project,'review.json'));
 assert.equal((await workflow(root,'demo','status',[],{loadTools})).ledger.purpose,'production');
 await assert.rejects(workflow(root,'demo','init',[],{loadTools}),/already exists/);
 assert.equal(fs.readdirSync(project).includes('REVIEW.json'),false);
});
test('managed export blocks missing exchange after import but permits footage-only',async t=>{
 const {root,project}=fixture(t);const native=path.join(project,'edit');
 fs.writeFileSync(path.join(project,'PROJECT.json'),JSON.stringify({nativeProject:'edit',workflow:{version:1}}));
 let rendered=0;const options={runtime:root,cwd:native,platform:'linux',env:{},runRender:async()=>rendered++};
 await finishRender(['render',native],options);assert.equal(rendered,1);
 fs.writeFileSync(path.join(project,'REVIEW.json'),JSON.stringify({imports:[{shot:'a'}]}));
 await assert.rejects(finishRender(['render',native],options),/requires EXCHANGE/);assert.equal(rendered,1);
});
test('exchange mismatch cannot overwrite active contract and valid updates preserve history',async t=>{
 const {root,project}=fixture(t);const tools={...handoff,preflight:()=>({ok:true})};
 fs.writeFileSync(path.join(project,'contract.json'),JSON.stringify({ledger:'REVIEW.json',nativeRoot:'bad'}));
 await assert.rejects(workflow(root,'demo','exchange',['contract.json'],{loadTools:async()=>tools}),/nativeRoot/);
 fs.writeFileSync(path.join(project,'contract.json'),JSON.stringify({ledger:'REVIEW.json',nativeRoot:'edit'}));
 await workflow(root,'demo','exchange',['contract.json'],{loadTools:async()=>tools});
 await workflow(root,'demo','exchange',['contract.json'],{loadTools:async()=>tools});
 assert.equal(fs.readdirSync(path.join(project,'evidence/exchange')).length,1);
});
test('brand integrity failure blocks preflight and contract save and appears in status before exchange exists',async t=>{
 const {root,project}=fixture(t);
 fs.writeFileSync(path.join(project,'PROJECT.json'),JSON.stringify({nativeProject:'edit',brand:{id:'neutral',version:'1.0.0',manifestSha256:'missing'}}));
 let invoked=0;const opts={loadTools:async()=>({...handoff,preflight:()=>{invoked++;return {ok:true};}})};
 const status=await workflow(root,'demo','status',[],opts);
 assert.equal(status.brandIntegrity.valid,false);assert.match(status.brandIntegrity.error,/brand integrity/);assert.equal(invoked,0);
 await assert.rejects(workflow(root,'demo','preflight',[],opts),/brand integrity/);
 fs.writeFileSync(path.join(project,'contract.json'),JSON.stringify({ledger:'REVIEW.json',nativeRoot:'edit'}));
 await assert.rejects(workflow(root,'demo','exchange',['contract.json'],opts),/brand integrity/);
 assert.equal(fs.existsSync(path.join(project,'EXCHANGE.json')),false);assert.equal(invoked,0);
});
test('managed workflow preflight runs Editor lint before exchange checks',async t=>{
 const {root,project}=fixture(t);fs.writeFileSync(path.join(project,'PROJECT.json'),JSON.stringify({nativeProject:'edit',workflow:{version:1}}));
 fs.writeFileSync(path.join(project,'EXCHANGE.json'),JSON.stringify({ledger:'REVIEW.json',nativeRoot:'edit'}));let checked=0,linted=0;
 const opts={loadTools:async()=>({...handoff,preflight:()=>{checked++;return {ok:true};}}),lintEditor:()=>{linted++;throw Error('Editor lint must pass before capture: missing_data_no_timeline');}};
 await assert.rejects(workflow(root,'demo','preflight',['--review-only'],opts),/missing_data_no_timeline/);assert.equal(linted,1);assert.equal(checked,0);
});

test('plain candidate approval is separate from optional exact-media viewing evidence',async t=>{
 const {root,project}=fixture(t);const crypto=await import('node:crypto');
 const media='review.mp4',bytes=Buffer.from('unit fixture media');fs.writeFileSync(path.join(project,media),bytes);
 handoff.init(path.join(project,'REVIEW.json'),'production');
 const artifact={kind:'cut',id:'main',revision:1,approvalBinding:'rendered-media',fingerprint:'f'.repeat(64),files:[{path:media,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length}],dependencies:[],media,metadata:{duration:2},approval:null,shotSelection:'explicit'};
 const ledger=JSON.parse(fs.readFileSync(path.join(project,'REVIEW.json')));ledger.artifacts.push(artifact);fs.writeFileSync(path.join(project,'REVIEW.json'),JSON.stringify(ledger));
 const opts={loadTools:async()=>({...handoff,probe:()=>({duration:2})})};
 const evidence={reviewer:'UNIT TEST ONLY',statement:'Approved',source:'Synthetic fixture, not human approval',fingerprint:artifact.fingerprint};
 const assessment={schemaVersion:2,media,durationSeconds:2,reviewer:'UNIT TEST',inspectedRanges:[],displayTarget:{context:'Not declared in fixture',minimumWidthPx:390},legibilityInspection:{status:'unavailable',inspectedWidthPx:null,checks:[],reason:'Fixture does not inspect a display frame'},playback:{status:'unavailable',reason:'Test has no playback'},listening:{status:'unavailable',reason:'Test has no listening'},defects:[]};
 fs.writeFileSync(path.join(project,'assessment.json'),JSON.stringify(assessment));
 const review=await workflow(root,'demo','review',['assessment.json'],opts);
 assert.equal(review.receipt.perceptualReviewComplete,false);
 // An optional receipt must still identify the candidate; it is not an approval prerequisite.
 fs.writeFileSync(path.join(project,'other.mp4'),'other');
 const other={...assessment,media:'other.mp4'};fs.writeFileSync(path.join(project,'other.json'),JSON.stringify(other));
 const wrong=await workflow(root,'demo','review',['other.json'],opts);
 fs.writeFileSync(path.join(project,'approval.json'),JSON.stringify({...evidence,reviewReceipt:path.relative(project,wrong.receiptPath)}));
 await assert.rejects(workflow(root,'demo','approve',['cut','main','approval.json'],opts),/different media/);
 fs.writeFileSync(path.join(project,'approval.json'),JSON.stringify(evidence));
 const approved=await workflow(root,'demo','approve',['cut','main','approval.json'],opts);
 assert.equal(approved.statement,'Approved');assert.match(approved.approvalMeaning,/no viewing/);
 const delivered=await workflow(root,'demo','deliver',['delivery/final.mp4'],opts);
 assert.equal(delivered.rendered,false);assert.deepEqual(fs.readFileSync(delivered.path),bytes);
 fs.appendFileSync(path.join(project,media),'changed');
 await assert.rejects(workflow(root,'demo','deliver',['delivery/changed.mp4'],opts),/changed/);
});

test('generator facade writes exclusive descriptors and shot registration checks animation assets',async t=>{
 const {root,project}=fixture(t);let called=false;
 fs.writeFileSync(path.join(project,'settings.json'),JSON.stringify({engineRevision:'fixture',renderSettings:{fps:24}}));
 const opts={loadTools:async()=>({...handoff,generateShotDescriptor:(base,options)=>{called=true;assert.equal(base,project);assert.equal(options.media,'render.mp4');return {files:['file'],...options};}})};
 const result=await workflow(root,'demo','descriptor',['render.mp4','settings.json','generated.json'],opts);assert(called);assert.equal(result.files,1);
 await assert.rejects(workflow(root,'demo','descriptor',['render.mp4','settings.json','generated.json'],opts),/EEXIST/);
 fs.writeFileSync(path.join(project,'PROJECT.json'),JSON.stringify({nativeProject:'edit',animationProject:'animation',brand:{id:'missing'}}));
 fs.mkdirSync(path.join(project,'animation/app'),{recursive:true});
 const status=await workflow(root,'demo','status',[],opts);assert.equal(status.brandIntegrity.animation.state,'failed');assert.equal(status.brandIntegrity.native.state,'failed');
 await assert.rejects(workflow(root,'demo','register',['shot','main','generated.json'],opts),/brand integrity.*animation/i);
});
test('descriptor facade rejects malformed settings with a field/path and writes nothing',async t=>{
 const {root,project}=fixture(t);let called=false;
 const opts={loadTools:async()=>({...handoff,generateShotDescriptor:()=>{called=true;return {files:['file']};}})};
 await assert.rejects(workflow(root,'demo','descriptor',['render.mp4'],opts),/Use descriptor MEDIA SETTINGS.json OUTPUT.json/);
 fs.writeFileSync(path.join(project,'settings.json'),'[1,2]');
 await assert.rejects(workflow(root,'demo','descriptor',['render.mp4','settings.json','evidence/shot.json'],opts),/settings.*must contain a JSON object/);
 fs.writeFileSync(path.join(project,'settings.json'),'{');
 await assert.rejects(workflow(root,'demo','descriptor',['render.mp4','settings.json','evidence/shot.json'],opts),/Cannot read descriptor settings JSON.*settings.json/);
 assert.equal(called,false);assert.equal(fs.existsSync(path.join(project,'evidence')),false);
});
test('descriptor settings errors enumerate the accepted settings contract',async t=>{
 const {root,project}=fixture(t);fs.writeFileSync(path.join(project,'settings.json'),JSON.stringify({version:1}));
 await assert.rejects(workflow(root,'demo','descriptor',['render.mp4','settings.json','generated.json'],{loadTools:async()=>handoff}),/Unsupported descriptor option "version".*engineRevision.*renderSettings.*provenance.*files.*renderReceipt/);
 assert.equal(fs.existsSync(path.join(project,'generated.json')),false);
});

test('status explains approval order and blank planning without adding a gate dependency',async t=>{
 const {root,project,loadTools}=fixture(t),opts={loadTools};await workflow(root,'demo','init',[],opts);
 fs.mkdirSync(path.join(project,'animation'));fs.writeFileSync(path.join(project,'ANIMATION-REVIEW.md'),'# Review\n- Technical checks actually run and results:\n');
 const state=await workflow(root,'demo','status',[],opts);
 assert(state.next.some(n=>/render --review-only/.test(n)));assert(!state.next.some(n=>/approve storyboard/.test(n)));
 assert.equal(state.readiness.planning.find(p=>p.file==='ANIMATION-REVIEW.md').state,'needs-substantive-record');
});
test('prepare-review registers exact cut, presents honest limitations and requests editor without claiming a tab',async t=>{
 const {root,project}=fixture(t);fs.writeFileSync(path.join(project,'cut.mp4'),'synthetic');
 handoff.init(path.join(project,'REVIEW.json'),'synthetic-test');
 const board=handoff.register(path.join(project,'REVIEW.json'),'storyboard','main',{files:['STORYBOARD.md']});handoff.approve(path.join(project,'REVIEW.json'),'storyboard','main',{reviewer:'TEST',statement:'Test only',fingerprint:board.fingerprint});
 fs.writeFileSync(path.join(project,'cut.json'),JSON.stringify({files:['cut.mp4','edit/index.html'],media:'cut.mp4'}));
 fs.writeFileSync(path.join(project,'assessment.json'),JSON.stringify({schemaVersion:2,media:'cut.mp4',durationSeconds:2,reviewer:'TEST',inspectedRanges:[],displayTarget:{context:'Test mobile player',minimumWidthPx:390},legibilityInspection:{status:'unavailable',inspectedWidthPx:null,checks:[],reason:'No visual frame inspection in this workflow fixture'},playback:{status:'unavailable',reason:'Fixture only'},listening:{status:'unavailable',reason:'Fixture only'},defects:[]}));
 let editCalls=0,qcCalls=0;const opts={inspectCandidate:async(project,input)=>{qcCalls++;const bytes=fs.readFileSync(path.join(project,input.media));const receipt={kind:'encoded-candidate-qc',status:'passed',fullDecode:true,candidate:{path:input.media,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length},measured:{streams:[{type:'video'}]},checks:[{check:'full-decode',status:'pass'}]};const receiptPath=path.join(project,'evidence/encoded-qc/test.json');fs.mkdirSync(path.dirname(receiptPath),{recursive:true});fs.writeFileSync(receiptPath,JSON.stringify(receipt));return {receiptPath,receipt};},loadTools:async()=>({...handoff,register:(ledger,kind,id,descriptor)=>{const data=JSON.parse(fs.readFileSync(ledger));const artifact={kind,id,revision:1,fingerprint:'f'.repeat(64),media:descriptor.media,metadata:{duration:2},files:descriptor.files.map(path=>({path})),dependencies:[]};data.artifacts.push(artifact);fs.writeFileSync(ledger,JSON.stringify(data));return artifact;},status:()=>({artifacts:[{kind:'cut',id:'main',fingerprint:'f'.repeat(64),current:true,approved:false}]}),probe:()=>({duration:2})}),edit:async(native,args)=>{editCalls++;assert.deepEqual(args,['--background','--no-open']);return {url:'http://localhost:3000/#project/edit'};}};
 const result=await workflow(root,'demo','prepare-review',['main','cut.json','assessment.json'],opts);
 assert.equal(result.approval,false);assert.equal(result.review.receipt.perceptualReviewComplete,false);assert(fs.existsSync(result.gate.reportPath));assert.equal(editCalls,1);assert.equal(result.editor.hostTabOpened,false);assert(result.missing.some(x=>/approve cut/.test(x)));
 assert.ok(result.gate.improvementPacket);assert(fs.existsSync(path.join(project,result.gate.improvementPacket.packetPath)));
 assert.equal(qcCalls,1);
 const cached=await workflow(root,'demo','gate',['final',path.relative(project,result.review.receiptPath)],opts);assert.equal(qcCalls,1);assert.equal(JSON.parse(fs.readFileSync(cached.reportPath)).review.technicalQc.reused,true);
 fs.unlinkSync(path.join(project,'evidence/encoded-qc/test.json'));
 await assert.rejects(workflow(root,'demo','gate',['final',path.relative(project,result.review.receiptPath)],{...opts,inspectCandidate:async()=>({receiptPath:'failed-qc.json',receipt:{status:'failed',checks:[{check:'full-decode',status:'fail'}]}})}),/technical QC failed/);
});

test('all shipped blank planning templates remain incomplete and a table header is not evidence',async t=>{
 const {root,project,loadTools}=fixture(t);fs.mkdirSync(path.join(project,'animation'));
 const templates=path.resolve(path.dirname(tool),'../templates');
 for(const name of ['ANIMATION-TREATMENT.md','ANIMATION-SEQUENCE.md','ANIMATION-REVIEW.md'])fs.copyFileSync(path.join(templates,name),path.join(project,name));
 let result=await workflow(root,'demo','status',[],{loadTools});assert(result.readiness.planning.every(r=>r.state==='needs-substantive-record'));
 fs.appendFileSync(path.join(project,'ANIMATION-REVIEW.md'),'\n| Cue | Observation | Evidence |\n| --- | --- | --- |\n');
 result=await workflow(root,'demo','status',[],{loadTools});assert.equal(result.readiness.planning.find(r=>r.file==='ANIMATION-REVIEW.md').state,'needs-substantive-record');
 fs.appendFileSync(path.join(project,'ANIMATION-REVIEW.md'),'| 00:02 | Text clipped at edge | contact-sheet.png |\n');
 result=await workflow(root,'demo','status',[],{loadTools});assert.equal(result.readiness.planning.find(r=>r.file==='ANIMATION-REVIEW.md').state,'recorded-unassessed');
});
test('authored treatment is recognized and incomplete treatment names missing sections',async t=>{
 const {root,project,loadTools}=fixture(t);fs.mkdirSync(path.join(project,'animation'));
 const authored=['Visual world','Experience','Rhythm and transitions','Safety and accuracy','Audio'].map(name=>`## ${name}\nSpecific synthetic fixture decisions for ${name.toLowerCase()}.`).join('\n\n');fs.writeFileSync(path.join(project,'ANIMATION-TREATMENT.md'),authored);
 let status=await workflow(root,'demo','status',[],{loadTools});
 assert.equal(status.readiness.planning.find(item=>item.file==='ANIMATION-TREATMENT.md').state,'recorded-unassessed');
 fs.writeFileSync(path.join(project,'ANIMATION-TREATMENT.md'),'# Treatment\n\n## Visual world\nA paper bond unfolds across a dark desk.\n');
 status=await workflow(root,'demo','status',[],{loadTools});
 const action=status.readiness.planning.find(item=>item.file==='ANIMATION-TREATMENT.md').action;
 for(const section of ['Experience','Rhythm and transitions','Safety and accuracy','Audio'])assert.match(action,new RegExp(section));
 const placeholder=['Visual world','Experience','Rhythm and transitions','Safety and accuracy','Audio'].map(name=>`## ${name}\nDescribe the ${name.toLowerCase()} here.`).join('\n\n');
 fs.writeFileSync(path.join(project,'ANIMATION-TREATMENT.md'),placeholder);
 status=await workflow(root,'demo','status',[],{loadTools});
 assert.equal(status.readiness.planning.find(item=>item.file==='ANIMATION-TREATMENT.md').state,'needs-substantive-record');
});

test('readiness and QC routes reuse configured project and do not require handoff tools',async t=>{
 const {root,project}=fixture(t),opts={loadTools:async()=>{throw Error('unnecessary handoff load');},ffprobe:'fixture-probe',ffmpeg:'fixture-ffmpeg'};
 const readiness=await workflow(root,'demo','readiness',[],opts);assert.ok(readiness.production.checks.length);assert.match(readiness.production.notice,/Advisory/);
 fs.writeFileSync(path.join(project,'check.json'),JSON.stringify({media:'reviews/candidate.mp4'}));
 for(const [command,key] of [['qc','inspectCandidate'],['captions','inspectCaption'],['review-package','prepareWorkbench']]){
  const result=await workflow(root,'demo',command,['check.json'],{...opts,[key]:async(p,input,tools)=>{assert.equal(p,project);assert.equal(input.media,'reviews/candidate.mp4');assert.equal(tools.ffprobe,'fixture-probe');return {checked:command};}});
  assert.equal(result.checked,command);
 }
 const opened=await workflow(root,'demo','review-open',['packet.json','--port','4321'],{...opts,openWorkbench:async(p,file,{port})=>{assert.equal(p,project);assert.equal(file,'packet.json');assert.equal(port,4321);return {url:'http://127.0.0.1:4321'};}});assert.equal(opened.url,'http://127.0.0.1:4321');
});

test('visual planning routes a semantic beat without executing media tools or writing project files',async t=>{
 const f=fixture(t),input={schemaVersion:1,beats:[{id:'mechanism',startSeconds:0,durationSeconds:5,intent:'explain-mechanism',takeaway:'Flow increases when the valve opens',visualBrief:'Show a valve opening and a causal flow change',authenticity:'illustrative'}]};
 fs.writeFileSync(path.join(f.project,'VIDEO-PLAN.json'),JSON.stringify(input));
 const before=fs.readdirSync(f.project).sort();const result=await workflow(f.root,'demo','plan',['VIDEO-PLAN.json'],{loadTools:()=>{throw Error('No rendering tools expected');}});
 assert.equal(result.beats[0].route,'animation');assert.deepEqual(fs.readdirSync(f.project).sort(),before);
 await assert.rejects(workflow(f.root,'demo','plan',[]),/Use plan/);
 await assert.rejects(workflow(f.root,'demo','plan',['../outside.json']),/project-relative/);
});
