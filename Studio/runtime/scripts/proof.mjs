/** Isolated technical proofs: never production imports or human approvals. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {readBrandPack} from './brand.mjs';
import {assertBrowserLaunchAllowed} from './browser-launch.mjs';
import {withRunReport} from './tool-run.mjs';
import {resolveWorkspace} from './workspace.mjs';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const rate=v=>{const [n,d=1]=String(v).split('/').map(Number);return n/d;};
async function safeDirectory(root,rel){
 if(!/^reviews\/proof\/[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(rel))throw Error('Proof directory must be reviews/proof/<version>');
 let current=root;if((await fs.lstat(current)).isSymbolicLink())throw Error('Proof paths must not be symlinks');
 for(const part of rel.split('/')){current=path.join(current,part);const stat=await fs.lstat(current);if(stat.isSymbolicLink()||!stat.isDirectory())throw Error('Proof paths must be real directories');}return current;
}
async function inventory(root,exclude){
 const files={};async function visit(dir,rel=''){for(const name of (await fs.readdir(dir)).sort()){
 const key=rel?rel+'/'+name:name;if(key===exclude)continue;const absolute=path.join(dir,name),st=await fs.lstat(absolute);
 if(st.isSymbolicLink())throw Error('Proof inputs must not contain symlinks: '+key);
 if(st.isDirectory())await visit(absolute,key);else if(st.isFile())files[key]=hash(await fs.readFile(absolute));else throw Error('Unsupported proof input: '+key);
 }}await visit(root);return files;
}
async function validateReferences(directory,files){
 for(const rel of Object.keys(files).filter(f=>/\.(html?|css)$/i.test(f))){
  const source=await fs.readFile(path.join(directory,rel),'utf8');
  const refs=[...source.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi),...source.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/gi)].map(m=>m[1]);
  for(const ref of refs){if(ref.startsWith('#')||ref.startsWith('data:'))continue;
   if(/^(?:[a-z]+:|\/|\\)/i.test(ref))throw Error('Proof references must be self-contained local files: '+ref);
   const clean=decodeURIComponent(ref.split(/[?#]/)[0]),resolved=path.resolve(directory,path.dirname(rel),clean),key=path.relative(directory,resolved).split(path.sep).join('/');
   if(key.startsWith('../')||!files[key])throw Error('Proof reference missing or outside proof directory: '+ref);
  }
 }
}
async function brand(projectRoot,proofRoot){
 const project=JSON.parse(await fs.readFile(path.join(projectRoot,'PROJECT.json'),'utf8'));
 if(!project.brand)throw Error('Proof requires a pinned project brand');
 const original=await readBrandPack(path.join(projectRoot,'brand')),copy=await readBrandPack(path.join(proofRoot,'assets/brand'));
 if(original.manifestSha256!==project.brand.manifestSha256||original.manifest.id!==project.brand.id||original.manifest.version!==project.brand.version||copy.manifestSha256!==original.manifestSha256)throw Error('Proof brand differs from pinned project snapshot');
 return project.brand;
}
async function defaultTools(runtime){return import(pathToFileURL(path.join(resolveWorkspace(runtime).skills,'director/tools/animation-handoff.mjs')).href);}
export async function proofRender(projectRoot,proofRelativeDir,{runtime,env=process.env,platform=process.platform,runRender,loadTools=defaultTools,decode}={}){
 return withRunReport({directory:projectRoot,stage:'workflow-proof',details:{route:'proof',proofDirectory:proofRelativeDir}},async()=>{
 assertBrowserLaunchAllowed({env,platform});
 const directory=await safeDirectory(projectRoot,proofRelativeDir),config=JSON.parse(await fs.readFile(path.join(directory,'PROOF.json'),'utf8'));
 if(config.schemaVersion!==1||config.entry!=='index.html'||!/^[-a-zA-Z0-9_]+\.mp4$/.test(config.output)||![config.width,config.height].every(v=>Number.isInteger(v)&&v>=64&&v<=4096&&v%2===0)||!(rate(config.fps)>0&&rate(config.fps)<=120)||!(Number.isFinite(config.duration)&&config.duration>0&&config.duration<=120))throw Error('Invalid PROOF.json: require index.html, local MP4 output, even canvas, fps and duration up to 120 seconds');
 const output=path.join(directory,config.output);try{await fs.lstat(output);throw Error('Proof output exists; use a new proof version or output name');}catch(e){if(e.code!=='ENOENT')throw e;}
 const before=await inventory(directory,config.output);if(!before['index.html'])throw Error('Proof requires index.html');
 await validateReferences(directory,before);
 const pinned=await brand(projectRoot,directory),projectHash=hash(await fs.readFile(path.join(projectRoot,'PROJECT.json')));
 const tools=await loadTools(runtime);if(typeof runRender!=='function')throw Error('Proof requires the managed native render callback');
 await runRender(['render',directory,'--output',output,'--fps',String(config.fps)],{cwd:directory});
 if((await fs.lstat(output)).isSymbolicLink())throw Error('Proof output must not be a symlink');
 if(hash(await fs.readFile(path.join(projectRoot,'PROJECT.json')))!==projectHash||JSON.stringify(await brand(projectRoot,directory))!==JSON.stringify(pinned)||JSON.stringify(await inventory(directory,config.output))!==JSON.stringify(before))throw Error('Proof inputs changed during rendering; no verified receipt issued');
 const measured=await tools.probe(output,env.HYPERFRAMES_FFPROBE_PATH||env.FFPROBE_PATH);
 if(!Number.isFinite(measured.duration)||!Number.isFinite(rate(measured.fps))||measured.width!==config.width||measured.height!==config.height||Math.abs(rate(measured.fps)-rate(config.fps))>1e-6||Math.abs(measured.duration-config.duration)>1/rate(config.fps)+1e-6)throw Error('Encoded proof dimensions, frame rate or duration mismatch');
 if(decode)await decode(output);else execFileSync(env.HYPERFRAMES_FFMPEG_PATH||env.FFMPEG_PATH||'ffmpeg',['-v','error','-xerror','-i',output,'-f','null','-'],{timeout:180000,stdio:'pipe'});
 const receipt={schemaVersion:1,kind:'internal-proof',browserTelemetry:{available:false,launches:[],unavailableReason:'Editor native renderer does not expose effective browser identity telemetry'},approval:false,productionImport:false,createdAt:new Date().toISOString(),brand:pinned,projectSha256:projectHash,inputs:before,output:{path:proofRelativeDir+'/'+config.output,sha256:hash(await fs.readFile(output)),metadata:measured,decoded:true},limitations:['Technical validation only; no visual, listening or creative approval.','Use self-contained local inputs; undeclared external network resources are not inventoried.']};
 const folder=path.join(projectRoot,'evidence/proofs');await fs.mkdir(folder,{recursive:true});const receiptPath=path.join(folder,crypto.randomUUID()+'.json');await fs.writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});return {receiptPath,receipt};
 });
}
