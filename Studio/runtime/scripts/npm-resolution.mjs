import fs from 'node:fs';
import path from 'node:path';

/** Resolve npm beside the active Node runtime, including Cellar and portable layouts. */
export function resolveNpmCli(executable=process.execPath,{env=process.env,platform=process.platform,isFile=file=>{
 try{return fs.statSync(file).isFile();}catch{return false;}
}}={}){
 const paths=platform==='win32'?path.win32:path;
 const checked=[];
 const candidates=[];
 if(env.JSTUDIO_NPM_CLI)candidates.push({file:env.JSTUDIO_NPM_CLI,explicit:true});
 if(env.npm_execpath)candidates.push({file:env.npm_execpath,explicit:false});
 const bin=paths.dirname(paths.resolve(executable));
 let cursor=bin;
 for(let depth=0;depth<12;depth++){
  for(const relative of ['lib/node_modules/npm/bin/npm-cli.js','node_modules/npm/bin/npm-cli.js','share/node_modules/npm/bin/npm-cli.js'])
   candidates.push({file:paths.join(cursor,relative),explicit:false});
  const parent=paths.dirname(cursor);if(parent===cursor)break;cursor=parent;
 }
 for(const {file,explicit} of candidates){
  if(!file)continue;
  const candidate=paths.resolve(file);
  if(checked.includes(candidate))continue;
  checked.push(candidate);
  if(isFile(candidate))return candidate;
  if(explicit&&file===env.JSTUDIO_NPM_CLI)throw Error(`JSTUDIO_NPM_CLI is not a readable npm CLI file: ${candidate}`);
 }
 throw Error(`Could not locate npm for Node at ${executable}. Checked: ${checked.join(', ')}. Repair the JStudio Node/npm installation or set JSTUDIO_NPM_CLI to npm-cli.js.`);
}
