import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';

// Bounded in-memory diagnostics; full output is retained only when a caller supplies a log.
export function diagnosticRun(command,args,{logPath, ...options}={}) {
 return new Promise((resolve,reject)=>{
  let tail='',firstError='',pending='';
  let log;
  try {if(logPath){fs.mkdirSync(path.dirname(logPath),{recursive:true});log=fs.openSync(logPath,'wx');}}catch(error){reject(error);return;}
  let child;
  try {child=spawn(command,args,{...options,stdio:['ignore','pipe','pipe']});}catch(error){if(log!==undefined)fs.closeSync(log);reject(error);return;}
  let settled=false;
  const finish=error=>{if(settled)return;settled=true;if(log!==undefined)fs.closeSync(log);error?reject(error):resolve();};
  const collect=(chunk,target)=>{
   if(settled)return;
   const text=chunk.toString();try{target.write(chunk);if(log!==undefined)fs.writeSync(log,chunk);}catch(error){child.kill();finish(error);return;}
   tail=(tail+text).slice(-8192);pending=(pending+text).slice(-16384);
   const lines=pending.split(/\r?\n/);pending=lines.pop();
   for(const line of lines)if(!firstError&&/\b(?:\w*Error|error|failed|failure)\b/.test(line)&&line.trim())firstError=line.trim().slice(0,1200);
  };
  child.stdout.on('data',chunk=>collect(chunk,process.stdout));child.stderr.on('data',chunk=>collect(chunk,process.stderr));
  child.on('error',finish);
  child.on('close',(code,signal)=>{
   if(code===0&&!signal){finish();return;}
   const cause=firstError||pending.trim().slice(0,1200)||tail.trim().split(/\r?\n/).at(-1)||'No diagnostic output';
   const error=Error(`${path.basename(command)} failed (${signal||code}): ${cause}${logPath?`; log: ${logPath}`:''}`);
   error.diagnostic={exitCode:code,signal,firstError:cause,logPath:logPath??null,tail};finish(error);
  });
 });
}
