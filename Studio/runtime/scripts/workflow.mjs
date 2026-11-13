#!/usr/bin/env node
/** One project router; delegates approval/media validation to the matched Director. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolveWorkspace} from './workspace.mjs';
import {withRunReport} from './tool-run.mjs';
import {verifyProjectBrandCopies} from './brand.mjs';
import {writeGateReport} from './gate-report.mjs';
import {deliverApprovedCut} from './delivery.mjs';
import {reviewReadiness} from './review-readiness.mjs';
import {writeReviewReceipt,verifyReviewReceipt} from './review-receipt.mjs';
import {lintNativeEditor} from './editor-lint.mjs';
import {inspectEncodedCandidate} from './encoded-qc.mjs';
import {inspectCaptions} from './caption-qc.mjs';
import {createReviewWorkbench,startReviewWorkbench} from './review-workbench.mjs';
import {hashFile} from './media-readiness.mjs';
import {planVisualProduction} from './visual-plan.mjs';
const runtime=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const commands=new Set(['plan','status','readiness','qc','captions','review-package','review-open','context','animation','edit','init','descriptor','attest','review','gate','register','prepare-review','approve','import','exchange','preflight','proof','render','deliver']);
export const help=`Studio workflow: npm run workflow -- <project-slug> <command> [arguments]
  status                             paths, handoff state and next actions
  plan INPUT.json                    choose per-beat media routes and acquisition jobs
  readiness                          advisory source/audio/caption evidence inventory
  qc ASSESSMENT.json                 full encoded-media decode and format checks
  captions ASSESSMENT.json           SRT/VTT syntax, timing and declared expectations
  review-package SETTINGS.json       QC and prepare exact-candidate review workspace
  review-open PACKET.json [--port N]  serve review workspace on loopback; Ctrl-C stops
  context intake|animation|finishing|review [MAX_CHARS]
  animation new|setup|doctor|render|review|update-engine [arguments]
  edit [Editor arguments]       open the configured native editor
  init [production|synthetic-test]    create project-root REVIEW.json
  descriptor MEDIA SETTINGS.json OUTPUT.json  generate complete shot inventory
  attest ASSESSMENT.json              record explicit media-bound human review evidence
  prepare-review main DESCRIPTOR.json [ASSESSMENT.json] [--no-editor]
  review ASSESSMENT.json              bind inspection coverage to actual media
  gate storyboard|animation|final [RECEIPT.json|-] [TELEMETRY.json]
                                      save quality, coverage and usage evidence plus a learning packet
  register storyboard|shot|cut ID DESCRIPTOR.json
  approve storyboard|shot|cut ID EVIDENCE.json
  import SHOT_ID [--review-only]     stage exact clip for candidate or approved reuse
  exchange CONTRACT.json [--review-only] validate candidate or approved edit
  preflight [--review-only]          check current edit against exchange
  proof render reviews/proof/<version>  guarded internal proof (PROOF.json)
  render [--review-only] [Editor arguments] guarded native export
  deliver delivery/NAME.mp4          copy approved complete candidate, exact bytes
Descriptor/evidence/contract filenames are relative to this project's root.
Descriptor SETTINGS.json accepts required engineRevision (string) and renderSettings (object), plus optional provenance (string) and files (project-relative paths). MEDIA is supplied separately; registration discovers the <media>.render.json receipt automatically.
Example SETTINGS.json: {"engineRevision":"Animator revision","renderSettings":{"width":1920,"height":1080,"fps":"24/1"},"provenance":"Project-local source note","files":[]}
Approval requires actual human evidence and the exact registered fingerprint.
Creative approval never asserts viewing/listening; optional reviewReceipt is checked against exact media.
Animation authoring: npm run workflow -- <project-slug> animation new
Edit native HTML freely after import; exchange maps actual native video elements.
Examples: npm run workflow -- bonds-bridge status
          npm run workflow -- bonds-bridge animation setup
          npm run workflow -- bonds-bridge descriptor animation/out/shot.mp4 animation/settings.json evidence/shot.json
Status is not creative approval. See Director references/studio-workflow.md.`;
const routeHelp={
 status:'Usage: npm run workflow -- <project-slug> status\nShows technical project state, readiness notes and next actions. It does not approve creative quality.',
 review:'Usage: npm run workflow -- <project-slug> review ASSESSMENT.json\nWrites an exact-media review receipt from the supplied assessment. Use --help before any project file is opened.',
 descriptor:'Usage: npm run workflow -- <project-slug> descriptor MEDIA SETTINGS.json OUTPUT.json\nMEDIA is the rendered shot. SETTINGS.json is a JSON object with required engineRevision and renderSettings, plus optional provenance and files. Example:\n{\n  "engineRevision": "Animator build or revision",\n  "renderSettings": { "width": 1920, "height": 1080, "fps": "24/1" },\n  "provenance": "Project-local source and asset note",\n  "files": []\n}\nThe descriptor generator supplies media from MEDIA. Registration infers the render receipt at <media>.render.json; do not include renderReceipt or a project version field in SETTINGS.json.',
 preflight:'Usage: npm run workflow -- <project-slug> preflight [--review-only]\nRuns pinned Editor lint and exchange/media checks. Lint errors and the known missing data-no-timeline warning stop before capture.',
 exchange:'Usage: npm run workflow -- <project-slug> exchange CONTRACT.json [--review-only]\nValidates pinned Editor lint and the complete edit contract before saving EXCHANGE.json.',
 render:'Usage: npm run workflow -- <project-slug> render [--review-only] [Editor arguments]\nManaged projects run pinned Editor lint and exchange checks before native capture.'
};
function helpFor(command){return routeHelp[command]??`Usage: npm run workflow -- <project-slug> ${command} [arguments]\n\n${help}`;}
const commandError=command=>`Unknown workflow command "${command}". Choose one of: ${[...commands].join(', ')}.\n\n${help}`;
function local(root,name){
 if(typeof name!=='string'||!name||path.isAbsolute(name)||name.split(/[\\/]/).includes('..'))throw Error('Expected a project-relative path');
 const result=path.resolve(root,name);let cursor=root;
 for(const part of path.relative(root,result).split(path.sep)){cursor=path.join(cursor,part);if(fs.existsSync(cursor)&&fs.lstatSync(cursor).isSymbolicLink())throw Error('Symlink path is unsupported: '+name);}
 return result;
}
export function resolveProject(root,slug){
 if(!/^[a-z0-9][a-z0-9_-]*$/.test(slug||''))throw Error('Use a project slug, not an arbitrary path');
 const workspace=resolveWorkspace(root),project=local(workspace.projects,slug);
 const manifestFile=local(project,'PROJECT.json'),manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
 const native=local(project,manifest.nativeProject||'hyperframes');
 return {workspace,project,manifestFile,manifest,native,ledger:local(project,manifest.workflow?.ledger||(fs.existsSync(path.join(project,'review.json'))?'review.json':'REVIEW.json')),exchange:local(project,'EXCHANGE.json')};
}
async function defaultTools(root){
 const directory=path.join(resolveWorkspace(root).skills,'director/tools');
 return {...await import(pathToFileURL(path.join(directory,'animation-handoff.mjs'))),...await import(pathToFileURL(path.join(directory,'animation-exchange.mjs'))),...await import(pathToFileURL(path.join(directory,'stage-context.mjs')))};
}
export async function workflow(root,slug,command,args=[],{loadTools=defaultTools,ffprobe,ffmpeg,render,edit,lintEditor=lintNativeEditor,inspectCandidate=inspectEncodedCandidate,inspectCaption=inspectCaptions,prepareWorkbench=createReviewWorkbench,openWorkbench=startReviewWorkbench}={}){
 if(command==='help')return help;
 if(!commands.has(command))throw Error(commandError(command));
 if(args.includes('--help')||args.includes('-h'))return helpFor(command);
 const p=resolveProject(root,slug);
 const read=name=>JSON.parse(fs.readFileSync(local(p.project,name),'utf8'));
 if(command==='plan'){
  if(args.length!==1)throw Error('Use plan INPUT.json');
  const file=local(p.project,args[0]);
  if(fs.statSync(file).size>2*1024*1024)throw Error('Visual plan input exceeds 2 MiB');
  return planVisualProduction(read(args[0]));
 }
 if(command==='readiness'){
  if(args.length)throw Error('Use readiness without arguments');
  return reviewReadiness(p.project,{animation:fs.existsSync(local(p.project,p.manifest.animationProject||'animation'))});
 }
 if(['qc','captions','review-package'].includes(command)){
  if(args.length!==1)throw Error(`Use ${command} ASSESSMENT.json`);
  const input=read(args[0]);
  if(command==='qc')return inspectCandidate(p.project,input,{ffprobe,ffmpeg});
  if(command==='captions')return inspectCaption(p.project,input,{ffprobe});
  return prepareWorkbench(p.project,input,{ffprobe,ffmpeg});
 }
 if(command==='review-open'){
  if(![1,3].includes(args.length)||(args.length===3&&args[1]!=='--port'))throw Error('Use review-open PACKET.json [--port N]');
  const opened=await openWorkbench(p.project,args[0],{port:args.length===3?Number(args[2]):0});
  return {url:opened.url,packet:args[0],notice:'Loopback review server is running. Ctrl-C stops it. Saving review never grants creative approval.'};
 }
 const tools=await loadTools(root);
 const candidateQc=async media=>{
  const file=local(p.project,media),bytes=fs.statSync(file).size,sha256=await hashFile(file),directory=local(p.project,'evidence/encoded-qc');
  if(fs.existsSync(directory))for(const name of fs.readdirSync(directory).sort().reverse()){
   if(!name.endsWith('.json'))continue;
   const receiptPath=local(p.project,'evidence/encoded-qc/'+name);
   if(!fs.statSync(receiptPath).isFile()||fs.statSync(receiptPath).size>2*1024*1024)continue;
   try{const receipt=JSON.parse(fs.readFileSync(receiptPath));if(receipt.kind==='encoded-candidate-qc'&&receipt.status==='passed'&&receipt.fullDecode===true&&receipt.candidate?.path===media&&receipt.candidate?.sha256===sha256&&receipt.candidate?.bytes===bytes&&receipt.measured?.streams?.some(s=>s.type==='video')&&receipt.checks?.some(c=>c.check==='full-decode'&&c.status==='pass'))return {receiptPath:path.relative(p.project,receiptPath),reused:true};}catch{}
  }
  const checked=await inspectCandidate(p.project,{media,expect:{streams:['video']}},{ffprobe,ffmpeg});
  if(checked.receipt?.status!=='passed')throw Object.assign(Error('Final candidate technical QC failed. Receipt: '+checked.receiptPath),{diagnostic:{receiptPath:checked.receiptPath,checks:checked.receipt?.checks}});
  return {receiptPath:path.relative(p.project,checked.receiptPath),reused:false};
 };
 const options={ffprobe};
 const latest=(kind,id)=>{
  const ledger=JSON.parse(fs.readFileSync(p.ledger));
  const artifact=ledger.artifacts.findLast(a=>a.kind===kind&&a.id===id);
  if(!artifact)throw Error('Register the artifact before recording its gate');
  return {ledger,artifact};
 };
 const stageFor=kind=>({storyboard:'storyboard',shot:'animation',cut:'final'})[kind];
 const saveGate=async(stage,event,review=null,telemetry=null)=>writeGateReport(p.project,{stage,event,review,telemetry,operations:p.workspace.operations,context:tools.buildStageContext?tools.buildStageContext(p.project,stage==='storyboard'?'intake':stage==='final'?'review':'animation'):null,snapshot:await workflow(root,slug,'status',[],{loadTools,ffprobe})});
 const checkReview=async(artifact,file,requireComplete=true)=>{
  if(!file)throw Error('Production animation/final review requires evidence.reviewReceipt for the exact latest render');
  const receipt=await verifyReviewReceipt(p.project,local(p.project,file),{mediaPath:artifact.media,expectedDuration:artifact.metadata.duration,requireComplete});
  return {path:file,receipt};
 };
 if(command==='context')return tools.buildStageContext(p.project,args[0],args[1]===undefined?12000:Number(args[1]));
 if(command==='status'){
  const state=fs.existsSync(p.ledger)?tools.status(p.ledger):null;
  const checkBrand=async engine=>{
   if(!p.manifest.brand)return {state:'legacy-unpinned',valid:null};
   if(engine==='animation'&&!fs.existsSync(local(p.project,p.manifest.animationProject||'animation')+'/app')&&!fs.existsSync(local(p.project,p.manifest.animationProject||'animation')+'/ANIMATION-WORKSPACE.json'))return {state:'not-created',valid:null};
   try{return {state:'verified',valid:true,result:await verifyProjectBrandCopies(p.project,{engine})};}
   catch(e){return {state:'failed',valid:false,error:e.message};}
  };
  const nativeBrand=await checkBrand('native'),animationBrand=await checkBrand('animation');
  const brandIntegrity={valid:nativeBrand.valid!==false&&animationBrand.valid!==false,native:nativeBrand,animation:animationBrand,error:[nativeBrand.error,animationBrand.error].filter(Boolean).join('; ')||null};
  let exchange={present:fs.existsSync(p.exchange),valid:false};
  if(exchange.present){try{if(nativeBrand.valid===false)throw Error(nativeBrand.error);exchange={present:true,valid:true,check:tools.preflight(p.project,'EXCHANGE.json',{...options,reviewOnly:JSON.parse(fs.readFileSync(p.exchange,'utf8')).reviewOnly===true})};}catch(e){exchange.error=e.message;}}
  const next=[];
  if(nativeBrand.valid===false)next.push('Restore native brand assets before native finishing');
  if(animationBrand.valid===false)next.push('Restore animation brand assets before Animator rendering or shot registration; unchanged approved imported clips may still finish');
  if(!state)next.push('init: create review ledger', 'Build the complete candidate; story and animation approvals are optional requested milestones');
  else {
   const shots=state.artifacts.filter(a=>a.kind==='shot');
   const ledger=JSON.parse(fs.readFileSync(p.ledger,'utf8'));
   const cut=state.artifacts.find(a=>a.kind==='cut'&&a.id==='main');
   if(cut?.approved&&cut.current)next.push('deliver delivery/<name>.mp4: promote the approved candidate without rendering');
   else if(cut?.current)next.push('Present the complete candidate, then approve cut main <evidence.json>; plain approval does not assert watching/listening');
   else {
    for(const shot of shots){
     if(!shot.current)next.push(`Rerender changed animation ${shot.id} before a new candidate`);
     else if(!ledger.imports.some(i=>i.fingerprint===shot.fingerprint))next.push(`import ${shot.id} --review-only`);
    }
    if(!exchange.valid)next.push('exchange <contract.json> --review-only: validate the complete review assembly; footage-only uses shots:[]');
    next.push('render --review-only --output ../reviews/candidates/<version>.mp4; then prepare-review main <descriptor.json> [assessment.json]');
   }
  }
  const readiness=reviewReadiness(p.project,{animation:fs.existsSync(local(p.project,p.manifest.animationProject||'animation'))||state?.artifacts.some(a=>a.kind==='shot')});
  for(const record of readiness.planning)if(record.state!=='recorded-unassessed')next.push(`${record.file}: ${record.state}; ${record.action??'use a project-local record'}`);
  return {project:p.project,native:p.native,readiness,brand:p.manifest.brand??null,brandIntegrity,ledger:state,exchange,next,notice:'Technical state only; no creative or release acceptance.'};
 }
 if(command==='init'){
  const result=tools.init(p.ledger,args[0]||'production');
  p.manifest.workflow={version:1,ledger:path.basename(p.ledger),exchange:'EXCHANGE.json'};
  fs.writeFileSync(p.manifestFile,JSON.stringify(p.manifest,null,2)+'\n');return result;
 }
 if(command==='descriptor'){
  if(args.length!==3||args.some(value=>typeof value!=='string'||!value))throw Error('Use descriptor MEDIA SETTINGS.json OUTPUT.json');
  const settingsFile=local(p.project,args[1]);let settings;
  try{settings=JSON.parse(fs.readFileSync(settingsFile,'utf8'));}catch(error){throw Error(`Cannot read descriptor settings JSON "${args[1]}": ${error.message}`);}
  if(!settings||typeof settings!=='object'||Array.isArray(settings))throw Error(`Descriptor settings "${args[1]}" must contain a JSON object`);
  const file=local(p.project,args[2]);
  const descriptor=tools.generateShotDescriptor(p.project,{...settings,media:args[0]});
  fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(descriptor,null,2)+'\n',{flag:'wx'});return {path:file,files:descriptor.files.length};
 }
 if(command==='review'||command==='attest'){
  const input=read(args[0]),media=local(p.project,input.media),measured=tools.probe(media,ffprobe);
  if(Math.abs(input.durationSeconds-measured.duration)>.05)throw Error('Review duration differs from measured media');
  return writeReviewReceipt(p.project,{...input,durationSeconds:measured.duration});
 }
 if(command==='gate'){
  const stage=args[0];let review=null;
  if(['animation','final'].includes(stage)){
   if(!args[1]||args[1]==='-')throw Error('Animation/final gate requires the exact review receipt');
   const receipt=await verifyReviewReceipt(p.project,local(p.project,args[1]));
   const data=JSON.parse(fs.readFileSync(p.ledger)),kind=stage==='animation'?'shot':'cut';
   const artifact=data.artifacts.findLast(a=>a.kind===kind&&a.media===receipt.media);
   if(!artifact||latest(kind,artifact.id).artifact.fingerprint!==artifact.fingerprint)throw Error('Review must match a latest registered artifact');
   if(!tools.status(p.ledger).artifacts.find(a=>a.kind===kind&&a.id===artifact.id)?.current)throw Error('Review artifact or dependency changed');
   review=await checkReview(artifact,args[1],false);
   if(stage==='final')review.technicalQc=await candidateQc(artifact.media);
  }else if(stage!=='storyboard')throw Error('Expected storyboard, animation or final gate');
  else if(!tools.status(p.ledger).artifacts.find(a=>a.kind==='storyboard'&&a.id==='main')?.current)throw Error('Register the current storyboard before presenting its gate');
  return saveGate(stage,'presented-for-review',review,args[2]?read(args[2]):null);
 }
 if(command==='register'){
  if(args[0]==='shot')await verifyProjectBrandCopies(p.project,{engine:'animation'});
  const artifact=tools.register(p.ledger,args[0],args[1],read(args[2]),options);
  const gate=await saveGate(stageFor(args[0]),'registered-awaiting-review');return {...artifact,gate,...(args[0]==='shot'?{readiness:reviewReadiness(p.project,{animation:true})}:{})};
 }
 if(command==='prepare-review'){
  const noEditor=args.includes('--no-editor'),pos=args.filter(a=>a!=='--no-editor');
  if(pos.length<2||pos.length>3||pos[0]!=='main')throw Error('Use prepare-review main DESCRIPTOR.json [ASSESSMENT.json] [--no-editor]');
  const descriptor=read(pos[1]);
  if(pos[2]&&read(pos[2]).media!==descriptor.media)throw Error('Assessment targets a different cut');
  const previous=fs.existsSync(p.ledger)?JSON.parse(fs.readFileSync(p.ledger)).artifacts.findLast(a=>a.kind==='cut'&&a.id==='main'):null;
  const sameFiles=previous&&(previous.approvalBinding==='rendered-media'||JSON.stringify(previous.files.map(f=>f.path).sort())===JSON.stringify([...(descriptor.files??[])].sort()));
  const reusable=previous&&sameFiles&&previous.media===descriptor.media&&JSON.stringify(previous.renderSettings??null)===JSON.stringify(descriptor.renderSettings??null)&&previous.engineRevision===(descriptor.engineRevision??null)&&descriptor.includedShots===undefined&&tools.status(p.ledger).artifacts.some(a=>a.fingerprint===previous.fingerprint&&a.current);
  const registered=reusable?previous:await workflow(root,slug,'register',['cut',pos[0],pos[1]],{loadTools,ffprobe});
  let review=null,gate=null;
  if(pos[2]){
   const assessment=read(pos[2]);if(assessment.media!==registered.media)throw Error('Assessment targets a different cut');
   review=await workflow(root,slug,'review',[pos[2]],{loadTools,ffprobe});
   gate=await workflow(root,slug,'gate',['final',path.relative(p.project,review.receiptPath)],{loadTools,ffprobe,ffmpeg,inspectCandidate});
  }
  let editor={requested:!noEditor,serverStarted:false,hostTabOpened:false,next:'Use the host app tab-opening tool with the verified editor URL; server start is not tab-opening evidence.'};
  if(!noEditor)try{const result=await workflow(root,slug,'edit',['--background','--no-open'],{loadTools,ffprobe,edit});editor={...editor,serverStarted:true,result:result??null};}catch(error){editor.error=error.message;}
  const state=await workflow(root,slug,'status',[],{loadTools,ffprobe});
  return {registered,review,gate,editor,missing:[...(!review?['Record an honest exact-cut assessment and present gate final; unavailable playback remains an honest limitation, separate from creative approval.']:[]),...state.next],approval:false};
 }
 if(command==='approve'){
  const evidence=read(args[2]);const {ledger,artifact}=latest(args[0],args[1]);let review=null;
  if(['shot','cut'].includes(args[0])&&evidence.reviewReceipt){
   review=await checkReview(artifact,evidence.reviewReceipt,false);
   if(review.receipt.defects.some(d=>['critical','high'].includes(d.severity)&&!['resolved','accepted'].includes(d.status)))throw Error('Resolve or explicitly accept blocking review defects before approval');
  }
  // Creative acceptance is distinct from unverifiable human playback. Preserve supplied words.
  if(['shot','cut'].includes(args[0]))evidence.approvalMeaning='Creative acceptance of the identified encoded artifact; no viewing/listening inferred';
  const approval=tools.approve(p.ledger,args[0],args[1],evidence);
  return {...approval,gate:await saveGate(stageFor(args[0]),'approval-recorded',review)};
 }
 if(command==='import')return tools.importShot(p.ledger,args[0],p.native,{reviewOnly:args.includes('--review-only')});
 if(command==='deliver')return deliverApprovedCut(p.project,p.ledger,args[0],{status:tools.status});
 if(command==='exchange'){
  const contract={...read(args[0]),...(args.includes('--review-only')?{reviewOnly:true}:{})};
  if(local(p.project,contract.ledger)!==p.ledger)throw Error('Managed exchange must use the project review ledger');
  if(path.resolve(p.project,contract.nativeRoot||'hyperframes')!==p.native)throw Error('Exchange nativeRoot differs from the configured Editor directory');
  await verifyProjectBrandCopies(p.project);
  if(p.manifest.workflow?.version===1)lintEditor(p.native);
  const result=tools.preflight(p.project,contract,{...options,reviewOnly:args.includes('--review-only')});
  if(fs.existsSync(p.exchange)){
   const history=path.join(p.project,'evidence/exchange');fs.mkdirSync(history,{recursive:true});
   fs.copyFileSync(p.exchange,path.join(history,`EXCHANGE-${Date.now()}.json`),fs.constants.COPYFILE_EXCL);
  }
  fs.writeFileSync(p.exchange,JSON.stringify(contract,null,2)+'\n');return result;
 }
 if(command==='preflight'){await verifyProjectBrandCopies(p.project);if(p.manifest.workflow?.version===1)lintEditor(p.native);return tools.preflight(p.project,'EXCHANGE.json',{...options,reviewOnly:args.includes('--review-only')});}
 if(command==='animation'){
  if(!['new','setup','doctor','render','review','update-engine'].includes(args[0]))throw Error('Expected animation new, setup, doctor, render, review or update-engine');
  const {main}=await import('./animation.mjs');return main([args[0],slug,...args.slice(1)],root);
 }
 if(command==='edit'){
  if(edit)return edit(p.native,args);
  const {hf}=await import('./common.mjs');return hf(['preview',p.native,...args],{cwd:p.native});
 }
 if(command==='proof'){
  if(args.length!==2||args[0]!=='render')throw Error('Use proof render reviews/proof/<version>');
  // Internal proof is a technical experiment, never a creative approval.
  const {proofRender}=await import('./proof.mjs');const {runtimeEnvironment}=await import('./runtime.mjs');const {run}=await import('./common.mjs');const env=(await runtimeEnvironment(root)).env;
  return proofRender(p.project,args[1],{runtime:root,env,runRender:(forwarded,options)=>run(process.execPath,[path.join(root,'node_modules/hyperframes/bin/hyperframes.mjs'),...forwarded],{cwd:p.project,...options,env})});
 }
 if(command==='render'){
  if(render)return render(p.native,args);
  const {hf}=await import('./common.mjs');return hf(['render',p.native,...args],{cwd:p.native});
 }
 throw Error(commandError(command));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try {
  const [slug,command,...args]=process.argv.slice(2);
  if(!slug||slug==='--help'||command==='--help'||command==='help')console.log(help);
  else if(args.includes('--help')||args.includes('-h'))console.log(helpFor(command));
  else if(!commands.has(command)){console.error(commandError(command));process.exitCode=2;}
  else {
   let ffprobe=process.env.FFPROBE_PATH,ffmpeg=process.env.FFMPEG_PATH;
   if(['register','review','attest','prepare-review','exchange','preflight','status','gate','qc','captions','review-package'].includes(command)){
    // Status can still explain missing setup; measured media checks then fail explicitly.
    try{const {runtimeEnvironment}=await import('./runtime.mjs');const {env}=await runtimeEnvironment(runtime);ffprobe=env.HYPERFRAMES_FFPROBE_PATH;ffmpeg=env.HYPERFRAMES_FFMPEG_PATH;}catch(e){if(command!=='status')throw e;}
   }
   const action=async()=>{const result=await workflow(runtime,slug,command,args,{ffprobe,ffmpeg});if(result?.receipt?.status==='failed')throw Object.assign(Error(`Technical checks failed. Receipt: ${result.receiptPath}`),{diagnostic:{receiptPath:result.receiptPath,checks:result.receipt.checks}});return result;};
   const ownReport=!['status','readiness','review-open','context','render','edit','proof'].includes(command)&&!(command==='animation'&&args[0]!=='new');
   const result=!ownReport?await action():await withRunReport({directory:resolveProject(runtime,slug).project,stage:'workflow-'+command,details:{route:'workflow',command,arguments:args}},action);
   if(result!==undefined)console.log(JSON.stringify(result,null,2));
  }
 }catch(e){console.error(e.message);process.exitCode=1;}
}
