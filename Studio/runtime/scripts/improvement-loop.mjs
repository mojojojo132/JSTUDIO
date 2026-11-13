#!/usr/bin/env node
/** Cross-project learning records. Raw film content stays in its own project. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {resolveWorkspace} from './workspace.mjs';

const DIMENSIONS = ['storyClarity','originality','visualCraft','pacingRhythm','legibilityAccessibility','sound','cohesion','factualAccuracy'];
const SCOPES = new Set(['film','studio','creative-system']);
const CATEGORIES = new Set(['creative-quality','review-coverage','telemetry','reliability','handoff','reuse','packaging','accessibility','factual-quality','other']);
const PRIORITIES = new Set(['P0','P1','P2','P3']);
const STATES = new Set(['proposed','accepted','deferred','rejected','implemented']);
const REGISTRY = 'STUDIO-IMPROVEMENTS.json';
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const shaPattern = /^[a-f0-9]{64}$/;

function inside(root,candidate) {
 const relative=path.relative(root,candidate);
 return relative===''||(!relative.startsWith(`..${path.sep}`)&&relative!=='..'&&!path.isAbsolute(relative));
}
function safeRelative(value,name='path') {
 if(typeof value!=='string'||!value.trim()||path.isAbsolute(value)||value.includes('\\')||value.split('/').some(part=>!part||part==='.'||part==='..'))throw Error(`${name} must be a safe relative path`);
 return value;
}
function safeProjectFile(root,relative,{required=true}={}) {
 safeRelative(relative,'Project evidence path');
 const absolute=path.resolve(root,...relative.split('/'));
 if(!inside(root,absolute))throw Error('Project evidence path escapes the project');
 let cursor=root;
 for(const part of relative.split('/')){cursor=path.join(cursor,part);if(fs.existsSync(cursor)&&fs.lstatSync(cursor).isSymbolicLink())throw Error(`Project evidence cannot use symlinks: ${relative}`);}
 if(!fs.existsSync(absolute)){if(required)throw Error(`Missing project evidence: ${relative}`);return null;}
 if(!fs.statSync(absolute).isFile())throw Error(`Project evidence must be a file: ${relative}`);
 return absolute;
}
function hashEvidence(root,relative,{required=false}={}) {
 const file=safeProjectFile(root,relative,{required});
 if(!file)return null;
 const stat=fs.statSync(file);
 if(stat.size>100*1024*1024)throw Error(`Evidence is too large to fingerprint: ${relative}`);
 return {path:relative,sha256:digest(fs.readFileSync(file)),bytes:stat.size};
}
function readJson(file,label) {
 try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch(error){throw Error(`Cannot read ${label}: ${error.message}`);}
}
function registryPath(operations) { return path.join(operations,REGISTRY); }
function emptyRegistry() { return {schemaVersion:1,createdAt:new Date().toISOString(),updatedAt:null,issues:[],runs:[],decisions:[]}; }
export function readImprovementRegistry(operations) {
 const file=registryPath(operations);
 if(!fs.existsSync(file))return emptyRegistry();
 if(fs.lstatSync(file).isSymbolicLink())throw Error('Studio improvement registry cannot be a symlink');
 const data=readJson(file,'Studio improvement registry');
 if(data.schemaVersion!==1||!Array.isArray(data.issues)||!Array.isArray(data.runs)||!Array.isArray(data.decisions))throw Error('Studio improvement registry has an unsupported schema');
 return data;
}
export function openStudioImprovements(operations,limit=12) {
 if(!Number.isInteger(limit)||limit<1||limit>100)throw Error('Improvement limit must be from 1 to 100');
 const registry=readImprovementRegistry(operations);
 const rank={P0:0,P1:1,P2:2,P3:3};
 return registry.issues.filter(issue=>['proposed','accepted'].includes(issue.state))
  .sort((a,b)=>(rank[a.priority]??9)-(rank[b.priority]??9)||b.occurrences-a.occurrences||a.title.localeCompare(b.title))
  .slice(0,limit).map(issue=>({id:issue.id,scope:issue.scope,category:issue.category,priority:issue.priority,state:issue.state,title:issue.title,owner:issue.owner,occurrences:issue.occurrences,firstSeenAt:issue.firstSeenAt,lastSeenAt:issue.lastSeenAt,acceptance:(issue.acceptance??[]).slice(0,3),nextAction:issue.observations?.at(-1)?.recommendedChange?.slice(0,500)??null}));
}
function summarizeQuality(quality) {
 if(!quality?.dimensions)return null;
 const dimensions={};
 for(const name of DIMENSIONS){const entry=quality.dimensions[name];if(!entry)continue;dimensions[name]={status:entry.status,rating:entry.status==='assessed'?entry.rating:null,evidenceCount:entry.evidence?.length??0,reason:entry.reason??null};}
 return {schemaVersion:quality.schemaVersion,dimensions,strengths:quality.strengths??[],opportunities:quality.opportunities??[]};
}
function commandSummary(commands=[]) {
 const byStatus={},byStage={},failures=[];
 for(const row of commands){
  const status=row.unreadable?'unreadable':row.operation?.status??'unknown';
  const stage=row.stage??'unknown';
  byStatus[status]=(byStatus[status]??0)+1;byStage[stage]=(byStage[stage]??0)+1;
  if(status==='failed')failures.push({stage,runId:row.runId??null,error:String(row.operation?.error??'Recorded command failure').slice(0,500),report:row.report??null});
 }
 return {scope:'saved project receipts only; not a complete host activity inventory',total:commands.length,byStatus,byStage,failures};
}
function workflowSummary(snapshot) {
 const ledger=snapshot?.ledger;
 return {brandIntegrity:snapshot?.brandIntegrity?.valid??null,exchange:{present:snapshot?.exchange?.present??false,valid:snapshot?.exchange?.valid??false},
  artifacts:(ledger?.artifacts??[]).map(({kind,id,revision,current,approved,fingerprint,media})=>({kind,id,revision,current,approved,fingerprint,media})),next:(snapshot?.next??[]).slice(0,12)};
}
function readRunTelemetry(file) {
 if(!file||!fs.existsSync(file)||fs.lstatSync(file).isSymbolicLink())return null;
 const report=readJson(file,'gate token report');
 return {coverage:report.coverage??null,totals:report.tokens??null,cost:report.cost??null,byParticipant:report.byParticipant??[],byModel:report.byModel??[],byStage:report.byStage??[],attempts:report.attempts??null,
  semantics:report.semantics??'Token fields come only from explicitly supplied usage telemetry.'};
}
function markdownForPacket(packet) {
 const lines=[`# Improvement packet: ${packet.packetId}`,'',`Project: ${packet.projectSlug}. Gate: ${packet.gate.stage}/${packet.gate.event}.`,`Created: ${packet.createdAt}.`,`Candidate: ${packet.candidate?.media??'not applicable'} (${packet.candidate?.mediaSha256??'no media hash'}).`,'',
  'This packet supports learning across productions. It is evidence, not a new approval gate. Keep film-specific revisions in the project. Send only generalized Studio or creative-system findings to the shared registry. Do not paste source scripts, private media, captions or client details into shared findings.','',
  '## Review coverage','',`Playback: ${packet.review?.playback?.status??'not available'}; listening: ${packet.review?.listening?.status??'not available'}; declared range coverage: ${packet.review?.coverage?.declaredRangeCoverageComplete??false}; target-width legibility complete: ${packet.review?.coverage?.legibilityComplete??false}; perceptual review complete: ${packet.review?.coverage?.perceptualReviewComplete??false}.`,`Display target: ${packet.review?.displayTarget?`${packet.review.displayTarget.minimumWidthPx}px minimum (${packet.review.displayTarget.context})`:'not recorded'}; legibility inspection: ${packet.review?.legibilityInspection?.status??'not recorded'}${packet.review?.legibilityInspection?.inspectedWidthPx?` at ${packet.review.legibilityInspection.inspectedWidthPx}px`:''}.`,'',
  '## Recorded commands','',`Project receipts: ${packet.commands.total}; failures: ${packet.commands.failures.length}. These are recorded commands only.`,'',
  '## Token and cost telemetry','',`Token coverage complete: ${packet.tokenUsage?.coverage?.complete??false}. Actual cost coverage complete: ${packet.tokenUsage?.cost?.complete??false}. Missing values remain null; command time and excerpt length are not token measurements, and pricing is never estimated.`,'',
  '## Prior Studio findings',''];
 if(packet.priorStudioFindings.length)for(const issue of packet.priorStudioFindings)lines.push(`- ${issue.id} [${issue.priority}, ${issue.state}, seen ${issue.occurrences} time(s)]: ${issue.title}`);
 else lines.push('No open shared Studio findings are recorded yet.');
 lines.push('','## Evidence sources','','| Path | SHA-256 |','| --- | --- |');
 for(const item of packet.sources)lines.push(`| ${item.path} | ${item.sha256} |`);
 lines.push('','Review the evidence sources and exact project artifacts. Add generalized findings to FINDINGS.json using the supplied template; include only verifiable evidence references, a root-cause hypothesis, owner, priority and observable acceptance checks. An empty findings list is valid when no reusable system lesson was found.');
 return lines.join('\n')+'\n';
}
export function createImprovementPacket(project,{stage,event,snapshot,review=null,tokenReport,commands=[],receiptSummary=null,context=null,operations,packetId}={}) {
 if(!['storyboard','animation','final'].includes(stage)||event!=='presented-for-review')throw Error('Improvement packets are created at a presented-for-review gate');
 const id=packetId??`${new Date().toISOString().replace(/[:.]/g,'-')}-${crypto.randomUUID()}`;
 if(!/^[\w-]{8,120}$/.test(id))throw Error('Invalid improvement packet id');
 const runFile=tokenReport?.json??null;
 const tokenData=readRunTelemetry(runFile);
 const sources=[];
 const add=(relative,kind)=>{const record=hashEvidence(project,relative);if(record&&!sources.some(item=>item.path===record.path))sources.push({...record,kind});};
 for(const relative of ['BRIEF.md','STORYBOARD.md','INTERACTION-LOG.md'])add(relative,'project-context');
 for(const relative of ['ANIMATION-TREATMENT.md','ANIMATION-SEQUENCE.md','ANIMATION-REVIEW.md'])add(relative,'animation-planning');
 if(review?.path)add(review.path,'review-receipt');
 if(review?.receipt?.media)add(review.receipt.media,'encoded-candidate');
 if(runFile)add(path.relative(project,runFile).split(path.sep).join('/'),'gate-token-report');
 if(context?.path)add(context.path,'stage-context');
 const commandsPath=path.join(project,'evidence/runs');
 let priorCommandRuns=0;
 if(fs.existsSync(commandsPath)&&!fs.lstatSync(commandsPath).isSymbolicLink()){
  const reports=fs.readdirSync(commandsPath).sort().slice(-50);
  for(const name of reports){const relative=`evidence/runs/${name}/RUN-REPORT.json`;const record=hashEvidence(project,relative);if(record){sources.push({...record,kind:'command-report'});priorCommandRuns++;}}
 }
 const registry=readImprovementRegistry(operations);
 const packet={schemaVersion:1,packetId:id,createdAt:new Date().toISOString(),projectSlug:path.basename(project),
  gate:{stage,event},candidate:review?.receipt?{media:review.receipt.media,mediaSha256:review.receipt.mediaSha256,durationSeconds:review.receipt.durationSeconds}:null,
  review:review?.receipt?{inspectionMethod:review.receipt.inspectionMethod,coverage:{declaredRangeCoverageComplete:review.receipt.declaredRangeCoverageComplete,continuousPlaybackComplete:review.receipt.continuousPlaybackComplete,listeningComplete:review.receipt.listeningComplete,legibilityComplete:review.receipt.legibilityComplete??null,perceptualReviewComplete:review.receipt.perceptualReviewComplete},displayTarget:review.receipt.displayTarget??null,legibilityInspection:review.receipt.legibilityInspection??null,playback:review.receipt.playback,listening:review.receipt.listening,defects:review.receipt.defects,qualityAssessment:summarizeQuality(review.receipt.qualityAssessment)}:null,
  workflow:workflowSummary(snapshot),commands:commandSummary(commands),priorRecordedCommandRuns:priorCommandRuns,receiptSummary:receiptSummary??null,tokenUsage:tokenData,
  stageContext:context?{snapshotId:context.snapshotId??null,manifestHash:context.manifestHash??null,files:context.files?.map(({path,sha256,characters,truncated})=>({path,sha256,characters,truncated}))??[]}:null,
  priorStudioFindings:openStudioImprovements(operations,12),sources};
 const directory=path.join(project,'evidence/improvement-packets',id);
 fs.mkdirSync(directory,{recursive:true});
 const relativePacket=`evidence/improvement-packets/${id}/PACKET.json`,packetPath=path.join(project,...relativePacket.split('/'));
 const packetBytes=Buffer.from(JSON.stringify(packet,null,2)+'\n');fs.writeFileSync(packetPath,packetBytes,{flag:'wx'});
 const packetSha=digest(packetBytes),template={schemaVersion:1,packet:{path:relativePacket,sha256:packetSha},findings:[]};
 const templatePath=path.join(directory,'FINDINGS.template.json');fs.writeFileSync(templatePath,JSON.stringify(template,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(directory,'PACKET.md'),markdownForPacket(packet),{flag:'wx'});
 return {packetPath:relativePacket,packetSha256:packetSha,findingsTemplatePath:path.relative(project,templatePath).split(path.sep).join('/')};
}
function requiredText(value,name,max=1200) { if(typeof value!=='string'||!value.trim()||value.length>max)throw Error(`${name} must be nonempty and at most ${max} characters`);return value.trim(); }
function validateFinding(finding,index,packet) {
 const label=`findings[${index}]`;
 if(!finding||typeof finding!=='object'||Array.isArray(finding))throw Error(`${label} must be an object`);
 const id=requiredText(finding.id,`${label}.id`,80),themeKey=requiredText(finding.themeKey,`${label}.themeKey`,100);
 for(const [name,value] of [['id',id],['themeKey',themeKey]])if(!/^[a-z0-9][a-z0-9._-]*$/.test(value))throw Error(`${label}.${name} must be a lowercase stable key`);
 if(!SCOPES.has(finding.scope))throw Error(`${label}.scope must be film, studio or creative-system`);
 if(!CATEGORIES.has(finding.category))throw Error(`${label}.category is unsupported`);
 if(!PRIORITIES.has(finding.priority))throw Error(`${label}.priority must be P0, P1, P2 or P3`);
 if(!['low','medium','high'].includes(finding.confidence))throw Error(`${label}.confidence must be low, medium or high`);
 if(!Array.isArray(finding.acceptance)||finding.acceptance.length<1||finding.acceptance.length>8)throw Error(`${label}.acceptance must contain 1 to 8 checks`);
 const acceptance=finding.acceptance.map((value,i)=>requiredText(value,`${label}.acceptance[${i}]`,300));
 if(!Array.isArray(finding.evidence)||finding.evidence.length<1||finding.evidence.length>12)throw Error(`${label}.evidence must contain 1 to 12 source references`);
 const allowed=new Map(packet.sources.map(source=>[source.path,source.sha256]));
 const evidence=finding.evidence.map((item,i)=>{
  const p=safeRelative(item?.path,`${label}.evidence[${i}].path`),expected=allowed.get(p);
  if(!expected||item.sha256!==expected||!shaPattern.test(item.sha256))throw Error(`${label}.evidence[${i}] is not an exact source in the packet`);
  return {path:p,sha256:expected};
 });
 return {id,scope:finding.scope,category:finding.category,themeKey,priority:finding.priority,title:requiredText(finding.title,`${label}.title`,160),
  observation:requiredText(finding.observation,`${label}.observation`,1600),causeHypothesis:requiredText(finding.causeHypothesis,`${label}.causeHypothesis`,1600),
  recommendedChange:requiredText(finding.recommendedChange,`${label}.recommendedChange`,1600),acceptance,confidence:finding.confidence,owner:requiredText(finding.owner,`${label}.owner`,80),evidence};
}
function writeJsonAtomic(file,data) {
 const temporary=`${file}.${crypto.randomUUID()}.tmp`;
 fs.writeFileSync(temporary,JSON.stringify(data,null,2)+'\n',{flag:'wx'});
 try{fs.renameSync(temporary,file);}catch(error){try{fs.rmSync(temporary,{force:true});}catch{}throw error;}
}
function withRegistryLock(operations,action) {
 fs.mkdirSync(operations,{recursive:true});
 const target=registryPath(operations),lock=`${target}.lock`;let fd;
 try{fd=fs.openSync(lock,'wx');}catch(error){if(error.code==='EEXIST')throw Error('Another JStudio improvement update is in progress; retry after it completes');throw error;}
 try{return action(target);}finally{try{fs.closeSync(fd);}catch{}try{fs.unlinkSync(lock);}catch{}}
}
function updateIssue(registry,finding,source,now) {
 const key=`${finding.scope}:${finding.category}:${finding.themeKey}`;
 const id=`SI-${digest(Buffer.from(key)).slice(0,12)}`;
 let issue=registry.issues.find(item=>item.id===id);
 if(!issue){issue={id,key,scope:finding.scope,category:finding.category,themeKey:finding.themeKey,title:finding.title,priority:finding.priority,state:'proposed',owner:finding.owner,
   occurrences:0,firstSeenAt:now,lastSeenAt:now,acceptance:finding.acceptance,observations:[],decisions:[],sources:[]};registry.issues.push(issue);}
 // Packet IDs are unique, and project-local traceability stays in RECORD-*.json.
 // The shared registry intentionally carries no film slug or evidence path.
 const samePacket=issue.sources.find(item=>item.packetId===source.packetId);
 if(samePacket){if(!samePacket.findingIds.includes(source.findingId))samePacket.findingIds.push(source.findingId);samePacket.findingsSha256=source.findingsSha256;}
 else {
  const wasClosed=['implemented','deferred','rejected'].includes(issue.state);
  issue.sources.push({packetId:source.packetId,packetSha256:source.packetSha256,findingsSha256:source.findingsSha256,findingIds:[source.findingId]});issue.occurrences=issue.sources.length;issue.lastSeenAt=now;
  if(wasClosed){issue.state='proposed';issue.reopenedAt=now;issue.postDecisionRecurrences=(issue.postDecisionRecurrences??0)+1;}
  issue.observations.push({packetId:source.packetId,recordedAt:now,observation:finding.observation,causeHypothesis:finding.causeHypothesis,recommendedChange:finding.recommendedChange,confidence:finding.confidence,evidence:finding.evidence.map(({sha256})=>({sha256}))});
  if(({'P0':0,'P1':1,'P2':2,'P3':3}[finding.priority])<({'P0':0,'P1':1,'P2':2,'P3':3}[issue.priority]))issue.priority=finding.priority;
  if(issue.state==='proposed')issue.owner=finding.owner;
 }
 return issue;
}
function packetRunSummary(packet,source) {
 const dimensions=packet.review?.qualityAssessment?.dimensions??{};
 const commands=packet.commands??{};
 return {packetId:packet.packetId,packetSha256:source.packetSha256,stage:packet.gate.stage,recordedAt:new Date().toISOString(),
  candidate:packet.candidate?{durationSeconds:packet.candidate.durationSeconds}:null,
  review:{perceptualReviewComplete:packet.review?.coverage?.perceptualReviewComplete??false,legibilityComplete:packet.review?.coverage?.legibilityComplete??false,playback:packet.review?.playback?.status??'not-recorded',listening:packet.review?.listening?.status??'not-recorded',displayTarget:packet.review?.displayTarget??null,legibilityInspection:packet.review?.legibilityInspection??null,defectCount:packet.review?.defects?.length??0,qualityDimensions:dimensions},
  tokenUsage:packet.tokenUsage?{coverage:packet.tokenUsage.coverage,totals:packet.tokenUsage.totals,cost:packet.tokenUsage.cost}:null,
  commands:{total:commands.total??0,byStatus:commands.byStatus??{},byStage:commands.byStage??{},failureCount:commands.failures?.length??0}};
}
function validateAndMeasureSources(project,packet,evidence) {
 const allowed=new Map(packet.sources.map(source=>[source.path,source.sha256]));
 return evidence.map((item,index)=>{
  const relative=safeRelative(item?.path,`evidence[${index}].path`),expected=allowed.get(relative);
  if(!expected||item.sha256!==expected||!shaPattern.test(item.sha256))throw Error(`Evidence ${relative} is not bound to the packet`);
  const measured=hashEvidence(project,relative,{required:true});
  if(measured.sha256!==expected)throw Error(`Evidence changed after packet creation: ${relative}`);
  return {path:relative,sha256:expected};
 });
}
export function recordImprovementFindings(runtime,slug,findingsPath) {
 if(!/^[a-z0-9][a-z0-9_-]*$/.test(slug??''))throw Error('Use a project slug, not a path');
 const workspace=resolveWorkspace(runtime),projectBase=fs.realpathSync(workspace.projects),projectCandidate=path.join(projectBase,slug);
 if(!fs.existsSync(projectCandidate)||fs.lstatSync(projectCandidate).isSymbolicLink())throw Error('Configured project does not exist or is a symlink');
 const project=fs.realpathSync(projectCandidate);if(!inside(projectBase,project)||project===projectBase)throw Error('Project escapes configured projects root');
 const file=safeProjectFile(project,findingsPath,{required:true}),document=readJson(file,'improvement findings');
 if(document.schemaVersion!==1||!document.packet||!Array.isArray(document.findings))throw Error('Findings require schemaVersion 1, a packet reference and a findings array');
 const packetPath=safeProjectFile(project,document.packet.path,{required:true}),packetBytes=fs.readFileSync(packetPath),packetSha=digest(packetBytes);
 if(document.packet.sha256!==packetSha)throw Error('Improvement packet changed; regenerate findings from the exact packet');
 const packet=JSON.parse(packetBytes.toString('utf8'));
 if(packet.schemaVersion!==1||packet.projectSlug!==slug||packet.gate?.event!=='presented-for-review')throw Error('Packet does not identify this project review');
 for(const source of packet.sources??[]){const current=hashEvidence(project,source.path,{required:true});if(current.sha256!==source.sha256)throw Error(`Packet evidence changed since review: ${source.path}`);}
 const findingIds=new Set();
 const findings=document.findings.map((finding,index)=>{
  const normalized=validateFinding(finding,index,packet);
  if(findingIds.has(normalized.id))throw Error(`Duplicate finding id ${normalized.id}`);findingIds.add(normalized.id);
  normalized.evidence=validateAndMeasureSources(project,packet,normalized.evidence);
  return normalized;
 });
 const findingsBytes=Buffer.from(JSON.stringify(document,null,2)+'\n'),findingsSha=digest(findingsBytes),id=packet.packetId;
 const archiveDirectory=path.join(project,'evidence/improvement-packets',id);
 const archived=path.join(archiveDirectory,`FINDINGS-${findingsSha.slice(0,12)}.json`);
 if(!fs.existsSync(archived))fs.writeFileSync(archived,findingsBytes,{flag:'wx'});
 const now=new Date().toISOString(),source={projectSlug:slug,packetId:id,packetPath:document.packet.path,packetSha256:packetSha,findingsPath:path.relative(project,archived).split(path.sep).join('/'),findingsSha256:findingsSha};
 const localRecord={schemaVersion:1,recordedAt:now,projectSlug:slug,packet:{path:document.packet.path,sha256:packetSha},findings:findings.map(finding=>({...finding,registryId:finding.scope==='film'?null:`SI-${digest(Buffer.from(`${finding.scope}:${finding.category}:${finding.themeKey}`)).slice(0,12)}`}))};
 const localPath=path.join(archiveDirectory,`RECORD-${findingsSha.slice(0,12)}.json`);
 if(!fs.existsSync(localPath))fs.writeFileSync(localPath,JSON.stringify(localRecord,null,2)+'\n',{flag:'wx'});
 let systemCount=0,filmCount=0,created=[],recurrent=[];
 withRegistryLock(workspace.operations,target=>{
  const registry=fs.existsSync(target)?readImprovementRegistry(workspace.operations):emptyRegistry();
  if(!registry.runs.some(run=>run.packetId===id))registry.runs.push(packetRunSummary(packet,source));
  for(const finding of findings){
   if(finding.scope==='film'){filmCount++;continue;}
   const before=registry.issues.find(item=>item.key===`${finding.scope}:${finding.category}:${finding.themeKey}`);
   const wasObserved=before?.sources.some(item=>item.packetId===id)??false;
   const issue=updateIssue(registry,finding,{packetId:id,packetSha256:packetSha,findingsSha256:findingsSha,findingId:finding.id},now);
   systemCount++;
   if(!before)created.push(issue.id);else if(!wasObserved)recurrent.push(issue.id);
  }
  registry.updatedAt=now;writeJsonAtomic(target,registry);
 });
 return {project:slug,packetId:id,packetSha256:packetSha,recordPath:path.relative(project,localPath).split(path.sep).join('/'),globalRegistry:path.relative(workspace.home,registryPath(workspace.operations)).split(path.sep).join('/'),runRecorded:true,filmFindings:filmCount,systemFindings:systemCount,newIssues:[...new Set(created)],recurringIssues:[...new Set(recurrent)]};
}
function insideInstallation(workspace,relative) {
 safeRelative(relative,'Validation evidence path');
 const root=fs.realpathSync(path.dirname(workspace.home)),absolute=path.resolve(root,...relative.split('/'));
 if(!inside(root,absolute)||absolute===root)throw Error('Validation evidence must remain inside the JStudio installation');
 let current=root;for(const part of path.relative(root,absolute).split(path.sep)){current=path.join(current,part);if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw Error('Validation evidence cannot use symlinks');}
 if(!fs.existsSync(absolute)||!fs.statSync(absolute).isFile())throw Error(`Missing validation evidence: ${relative}`);
 return {path:relative,sha256:digest(fs.readFileSync(absolute))};
}
export function decideImprovement(runtime,id,state,note,evidencePath=null) {
 if(!/^SI-[a-f0-9]{12}$/.test(id??''))throw Error('Invalid Studio issue id');
 if(!['accepted','deferred','rejected','implemented'].includes(state))throw Error('State must be accepted, deferred, rejected or implemented');
 const rationale=requiredText(note,'Decision note',1200),workspace=resolveWorkspace(runtime),now=new Date().toISOString();
 let saved;
 withRegistryLock(workspace.operations,target=>{
  const registry=readImprovementRegistry(workspace.operations),issue=registry.issues.find(item=>item.id===id);
  if(!issue)throw Error(`Unknown Studio issue ${id}`);
  if(['deferred','rejected','implemented'].includes(issue.state)&&state!=='accepted')throw Error(`Issue is ${issue.state}; accept it again before changing its outcome`);
  let evidence=null;
  if(state==='implemented'){if(!evidencePath)throw Error('Implemented requires --evidence <validation-file>');evidence=insideInstallation(workspace,evidencePath);}
  issue.state=state;issue.lastDecisionAt=now;
  const decision={issueId:id,state,note:rationale,recordedAt:now,evidence};issue.decisions.push(decision);registry.decisions.push(decision);registry.updatedAt=now;writeJsonAtomic(target,registry);saved=issue;
 });
 return {id:saved.id,state:saved.state,decision:saved.decisions.at(-1),occurrences:saved.occurrences};
}
export function summarizeImprovementStatus(operations) {
 const registry=readImprovementRegistry(operations),rank={P0:0,P1:1,P2:2,P3:3};
 const issues=[...registry.issues].sort((a,b)=>(rank[a.priority]??9)-(rank[b.priority]??9)||b.occurrences-a.occurrences||a.title.localeCompare(b.title));
 const open=issues.filter(issue=>['proposed','accepted'].includes(issue.state));
 const rated={};
 for(const run of registry.runs)if(run.review?.perceptualReviewComplete===true)for(const [name,value] of Object.entries(run.review?.qualityDimensions??{}))if(value.status==='assessed'&&Number.isInteger(value.rating)){
  const entry=rated[name]??={sum:0,count:0,last:[]};entry.sum+=value.rating;entry.count++;entry.last.push({packetId:run.packetId,rating:value.rating,recordedAt:run.recordedAt});
 }
 const qualityTrend=Object.fromEntries(Object.entries(rated).map(([name,value])=>[name,{directionalMean:Number((value.sum/value.count).toFixed(2)),assessedRuns:value.count,last:value.last.slice(-10)}]));
 const coverage={runs:registry.runs.length,completeTokenRuns:registry.runs.filter(run=>run.tokenUsage?.coverage?.complete===true).length,completeCostRuns:registry.runs.filter(run=>run.tokenUsage?.cost?.complete===true).length,perceptualReviewRuns:registry.runs.filter(run=>run.review?.perceptualReviewComplete===true).length};
 return {schemaVersion:1,registryPath:path.join(operations,REGISTRY),updatedAt:registry.updatedAt,coverage,qualityTrend,openIssueCount:open.length,recurringOpenCount:open.filter(issue=>issue.occurrences>1).length,
  issues:issues.map(({id,scope,category,priority,state,title,owner,occurrences,firstSeenAt,lastSeenAt,acceptance,postDecisionRecurrences})=>({id,scope,category,priority,state,title,owner,occurrences,firstSeenAt,lastSeenAt,acceptance,postDecisionRecurrences:postDecisionRecurrences??0}))};
}
function usage() {
 return `JStudio continuous improvement\n\n  npm run improve -- status\n  npm run improve -- record <project-slug> evidence/improvement-packets/<packet-id>/FINDINGS.json\n  npm run improve -- decide <SI-id> accepted|deferred|rejected|implemented --note "reason" [--evidence path-inside-installation]\n\nReview gates create exact-evidence packets automatically. Director records film-only findings in that project and generalized Studio/creative-system findings in the shared configured profile. Use an empty findings array when no reusable finding exists. Implemented issues require a saved validation file. No token values are inferred.\n`;
}
export async function main(args=process.argv.slice(2),runtime=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')) {
 if(!args.length||args[0]==='--help'||args[0]==='help'){console.log(usage());return;}
 const workspace=resolveWorkspace(runtime);
 if(args[0]==='status'){
  if(args.length!==1)throw Error('Use npm run improve -- status');
  console.log(JSON.stringify(summarizeImprovementStatus(workspace.operations),null,2));return;
 }
 if(args[0]==='record'){
  if(args.length!==3)throw Error('Use npm run improve -- record <project-slug> FINDINGS.json');
  console.log(JSON.stringify(recordImprovementFindings(runtime,args[1],args[2]),null,2));return;
 }
 if(args[0]==='decide'){
  const [id,state,...rest]=args.slice(1);let note=null,evidence=null;
  for(let i=0;i<rest.length;i++){
   if(rest[i]==='--note'&&rest[i+1]){note=rest[++i];continue;}
   if(rest[i]==='--evidence'&&rest[i+1]){evidence=rest[++i];continue;}
   throw Error('Use --note "reason" and optional --evidence path');
  }
  if(!note)throw Error('Decision requires --note "reason"');
  console.log(JSON.stringify(decideImprovement(runtime,id,state,note,evidence),null,2));return;
 }
 throw Error(`Unknown improvement command "${args[0]}".\n\n${usage()}`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
 try{await main();}catch(error){console.error(error.message);process.exitCode=1;}
}
