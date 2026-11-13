/** Runs the bundled, pinned Editor linter before a managed native capture. */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const runtime=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const packageInfo=JSON.parse(fs.readFileSync(path.join(runtime,'package.json'),'utf8'));

export function lintNativeEditor(native,{run=spawnSync}={}){
 const entry=path.join(native,'index.html');
 if(!fs.existsSync(entry))return {passed:true,skipped:true,reason:'No Editor entry file exists yet; normal exchange validation will report missing composition inputs.'};
 if(fs.lstatSync(entry).isSymbolicLink())throw Error('Editor entry file cannot be a symlink during lint');
 const cli=path.join(runtime,'node_modules/hyperframes/bin/hyperframes.mjs');
 if(!fs.existsSync(cli))throw Error('Pinned Editor lint is unavailable; restore the matched JStudio runtime before rendering.');
 const result=run(process.execPath,[cli,'lint',native,'--json'],{cwd:runtime,encoding:'utf8',timeout:60000});
 if(result.error)throw Error(`Editor lint could not run: ${result.error.message}`);
 let report;
 try{report=JSON.parse(result.stdout.trim());}catch{throw Error(`Editor lint returned unreadable output${result.stderr?`: ${result.stderr.trim()}`:''}`);}
 if(report?._meta?.version!==packageInfo.dependencies?.hyperframes)throw Error(`Editor lint version ${report?._meta?.version??'unknown'} does not match the pinned runtime version ${packageInfo.dependencies?.hyperframes}.`);
 const findings=Array.isArray(report.findings)?report.findings:[];
 const blockers=findings.filter(item=>item.severity==='error'||item.code==='missing_data_no_timeline');
 if(result.status!==0||report.ok!==true||Number(report.errorCount)>0||blockers.length){
  const details=blockers.map(item=>`${item.code??item.severity}: ${item.message??'Editor lint finding'}${item.file?` (${item.file}${item.line?`:${item.line}`:''})`:''}${item.fixHint?` — ${item.fixHint}`:''}`);
  if(!details.length&&report.error)details.push(report.error);
  throw Error(`Editor lint must pass before capture.${details.length?` ${details.join(' | ')}`:' Review the native Editor lint report.'}`);
 }
 return {passed:true,skipped:false,version:report._meta.version,filesScanned:report.filesScanned??null,warningCount:report.warningCount??0};
}
