/** Immutable gate evidence, not another approval mechanism or token estimator. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {buildRunReport,unavailableRunInput,writeRunReport} from './run-report.mjs';
import {summarizeReceipts} from './receipt-summary.mjs';
import {createImprovementPacket} from './improvement-loop.mjs';
import {resolveWorkspace} from './workspace.mjs';
import {fileURLToPath} from 'node:url';
export function writeGateReport(project,{stage,event,snapshot,review=null,telemetry=null,context=null,operations=null}={}) {
 if(!['storyboard','animation','final'].includes(stage))throw Error('Unknown report stage');
 const id=new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID();
 const input=telemetry??unavailableRunInput({runId:'gate-'+id,stage,reason:'Host telemetry was not supplied at this gate. Command receipts are not model usage; provide explicit scoped telemetry including every participant.'});
 buildRunReport(input); // Validate before writing any gate files.
 const commands=[],runs=path.join(project,'evidence/runs');
 if(fs.existsSync(runs))for(const name of fs.readdirSync(runs).sort()){
  const directory=path.join(runs,name),file=path.join(directory,'RUN-REPORT.json');
  if(fs.lstatSync(directory).isSymbolicLink())continue;
  if(!fs.existsSync(file)||fs.lstatSync(file).isSymbolicLink())continue;
  try{const r=JSON.parse(fs.readFileSync(file));commands.push({report:path.relative(project,file).split(path.sep).join('/'),runId:r.runId,startedAt:r.startedAt,endedAt:r.endedAt,stage:r.entries?.[0]?.stage??null,operation:r.operation??null});}
  catch(error){commands.push({report:path.relative(project,file),unreadable:error.message});}
 }
 const folder=path.join(project,'evidence/gates',id);fs.mkdirSync(folder,{recursive:true});
 if(context)fs.writeFileSync(path.join(folder,'STAGE-CONTEXT.json'),JSON.stringify(context,null,2)+'\n',{flag:'wx'});
 const tokenReport=writeRunReport(input,path.join(folder,'RUN-REPORT.json'));
 const receiptSummary=summarizeReceipts(project,commands);
 let improvementPacket=null,improvementPacketError=null;
 if(event==='presented-for-review')try{
  const runtime=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),configuredOperations=operations??resolveWorkspace(runtime).operations;
  improvementPacket=createImprovementPacket(project,{stage,event,snapshot,review,tokenReport,commands,receiptSummary,
   context:context?{...context,path:path.relative(project,path.join(folder,'STAGE-CONTEXT.json')).split(path.sep).join('/')}:null,
   operations:configuredOperations,packetId:id});
 }catch(error){improvementPacketError=error.message;}
 const report={schemaVersion:1,recordedAt:new Date().toISOString(),stage,event,snapshot,review,commands,stageContext:context?path.relative(project,path.join(folder,'STAGE-CONTEXT.json')):null,tokenReport:{json:path.relative(project,tokenReport.json),markdown:path.relative(project,tokenReport.markdown)},improvementPacket,improvementPacketError,limitations:['Recorded commands only; direct or external activity may be absent.','Command timings do not measure AI usage; token scope comes only from supplied telemetry.','Review coverage is a supplied attestation bound to media bytes; not independent playback proof or human approval.',...(improvementPacketError?['Improvement packet could not be prepared; inspect improvementPacketError and retry after correcting the cause.']:[])]};
 report.receiptSummary=receiptSummary;
 const file=path.join(folder,'GATE-REPORT.json');fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 fs.writeFileSync(path.join(folder,'GATE-REPORT.md'),`# ${stage} gate report\n\nEvent: ${event}. Recorded commands: ${commands.length}.\n\n${review?.receipt?`Review: ${review.receipt.media}; playback ${review.receipt.playback.status}; listening ${review.receipt.listening.status}; defects ${review.receipt.defects.length}. Full details and limitations are in GATE-REPORT.json.\n\n`:''}${improvementPacket?`Continuous-improvement packet: ${improvementPacket.packetPath}; findings template: ${improvementPacket.findingsTemplatePath}.\n\n`:''}See GATE-REPORT.json for exact workflow state, review evidence and command records. RUN-REPORT.md contains measured or unavailable token fields.\n\n${report.limitations.map(s=>'- '+s).join('\n')}\n`,{flag:'wx'});
 return {reportPath:file,tokenReport:tokenReport.json,improvementPacket,improvementPacketError};
}
