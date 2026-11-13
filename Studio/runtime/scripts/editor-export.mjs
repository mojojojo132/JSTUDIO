/** Native UI export bridge: retain native jobs/progress while sharing CLI finishing checks. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {finishRender,renderReportDirectory} from './finishing.mjs';
import {unavailableRunInput,buildRunReport,renderRunReportMarkdown} from './run-report.mjs';
import {executionIdentity,commandInvocation} from './tool-run.mjs';
const runtime=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const digest=file=>fs.existsSync(file)?crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'):null;
export async function finishEditorExport(opts,runRender,{runtimeRoot=runtime,env=process.env,loadTools}={}) {
 const native=path.resolve(opts.project.dir),output=path.resolve(opts.outputPath);
 const fps=typeof opts.fps==='object'?`${opts.fps.num}/${opts.fps.den}`:String(opts.fps);
 const args=['render',native,'--output',output,'--fps',fps,...(opts.composition?['--composition',opts.composition]:[]),...(opts.outputResolution&&opts.outputResolution!=='auto'?['--resolution',String(opts.outputResolution)]:[])];
 const manual=path.join(native,'.hyperframes/studio-manual-edits.json'),manualBefore=digest(manual);
 const startedAt=new Date().toISOString(),id='editor-export-'+crypto.randomUUID();
 let receipt=null,error=null;
 try {
  receipt=await finishRender(args,{runtime:runtimeRoot,cwd:native,env,loadTools,runRender:async()=>{
   await runRender();
   if(digest(manual)!==manualBefore)throw Error('Native editor changes occurred during export; output requires revalidation');
  }});
  return receipt;
 } catch(e) {error=e;throw e;}
 finally {
  const folder=path.join(renderReportDirectory(args,native),'evidence/runs',id);
  const input=unavailableRunInput({runId:id,stage:'native-editor-export',startedAt,endedAt:new Date().toISOString(),reason:'Native editor export has no AI host token telemetry; this command is not a complete AI session inventory.'});
  input.operation={route:'native-editor-export',jobId:opts.jobId??null,status:error?'failed':'completed',error:error?.message??null,native,output,fps,composition:opts.composition??'index.html',quality:opts.quality??null,format:opts.format??null,outputResolution:opts.outputResolution??null,manualEditsSha256:manualBefore,finishing:receipt??null};
  const report=buildRunReport(input);
  report.operation={...input.operation,invocation:{...commandInvocation(args,native),transport:'native-editor-api'},build:await executionIdentity(runtimeRoot),diagnostic:error?.diagnostic??null,scope:'Native editor export command only; no creative approval or complete AI run accounting.'};
  fs.mkdirSync(folder,{recursive:true});
  const reportPath=path.join(folder,'RUN-REPORT.json');
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  fs.writeFileSync(path.join(folder,'RUN-REPORT.md'),renderRunReportMarkdown(report)+`\nCommand route: native-editor-export. Status: ${report.operation.status}. ${report.operation.error||''}\n`,{flag:'wx'});
  fs.writeFileSync(path.join(folder,'EDITOR-EXPORT.json'),JSON.stringify({...report.operation,tokenReport:reportPath},null,2)+'\n',{flag:'wx'});
 }
}
