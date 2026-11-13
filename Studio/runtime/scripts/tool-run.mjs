// Local command evidence. AI usage belongs to the host's explicit, non-overlapping run telemetry.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import {buildRunReport,renderRunReportMarkdown} from './run-report.mjs';

export function commandInvocation(argv=process.argv.slice(1),cwd=process.cwd()) {
 let redactNext=false;
 const safe=argv.map(value=>{if(redactNext){redactNext=false;return '[REDACTED]';}
  if(/^--?[^=]*(?:token|password|secret|api-key|authorization)/i.test(value)){
   if(value.includes('='))return value.slice(0,value.indexOf('=')+1)+'[REDACTED]';
   redactNext=true;
  }return value;});
 return {executable:path.basename(process.execPath),arguments:safe,cwd,node:process.version,platform:process.platform,arch:process.arch};
}

export async function executionIdentity(runtime=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')) {
 const identity={runtimeInventorySha256:null,packageVersion:null,executionEnvironment:process.platform==='darwin'&&process.env.CODEX_SANDBOX==='seatbelt'?'restricted-macos':'not-known-restricted',limitations:[]};
 try{identity.runtimeInventorySha256=crypto.createHash('sha256').update(await fs.readFile(path.join(runtime,'FILES.sha256'))).digest('hex');}catch{identity.limitations.push('Packaged runtime inventory unavailable');}
 try{identity.packageVersion=JSON.parse(await fs.readFile(path.join(runtime,'package.json'))).version;}catch{identity.limitations.push('Package version unavailable');}
 identity.limitations.push('Inventory digest identifies the declared build; this receipt alone does not verify every installed file.');return identity;
}

export async function withRunReport({directory,stage,details={}}, action) {
 const startedAt=new Date().toISOString(),runId=`${startedAt.replace(/[:.]/g,'-')}-${crypto.randomUUID()}`;
 const folder=path.join(directory,'evidence/runs',runId);
 await fs.mkdir(folder,{recursive:true});
 let result,failure;
 try {result=await action();} catch(error) {failure=error;}
 const endedAt=new Date().toISOString();
 const reason='This local command does not receive host AI token telemetry. Supply a separate scoped host run report including all agents; do not sum command reports as AI usage.';
 const report=buildRunReport({schemaVersion:1,runId,startedAt,endedAt,participantInventoryComplete:false,measurementScopeComplete:false,
  participants:[{id:'host-unavailable',role:'Initiating host; agent inventory is not exposed to the command'}],
  entries:[{id:'command',participantId:'host-unavailable',model:'unavailable',stage,attempt:1,startedAt,endedAt,
   source:{kind:'local-command',reference:stage,recordId:runId},tokens:{input:null,cachedInput:null,output:null,reasoningOutput:null,total:null},
   unavailableReasons:Object.fromEntries(['input','cachedInput','output','reasoningOutput','total'].map(key=>[key,reason]))}]});
 const safeDetails={...details};if(Array.isArray(safeDetails.arguments))safeDetails.arguments=commandInvocation(safeDetails.arguments).arguments;
 report.operation={...safeDetails,status:failure?'failed':'completed',invocation:commandInvocation(),build:await executionIdentity(),error:failure?.message??null,diagnostic:failure?.diagnostic??null,partialBrowserTelemetry:failure?.partialBrowserTelemetry??[],scope:'Command timing/status only; no creative approval or complete AI run accounting.'};
 try {
  await fs.writeFile(path.join(folder,'RUN-REPORT.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  await fs.writeFile(path.join(folder,'RUN-REPORT.md'),renderRunReportMarkdown(report)+`\nCommand status: ${report.operation.status}. ${report.operation.error||''}\n`,{flag:'wx'});
 } catch(error) {
  if(failure)throw new AggregateError([failure,error],`Command failed and report could not be saved: ${failure.message}; ${error.message}`);
  throw error;
 }
 console.log(`Run report: ${path.join(folder,'RUN-REPORT.json')} (host token usage unavailable)`);
 if(failure)throw failure;
 return result;
}
