import {assertBrowserLaunchAllowed} from './browser-launch.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {root,run} from './common.mjs';
import {studioHome,resolveWorkspace} from './workspace.mjs';
import {materializeAnimationBrand,verifyProjectBrandCopies,validateProjectFormat} from './brand.mjs';
import {runtimeEnvironment} from './runtime.mjs';
import {withRunReport} from './tool-run.mjs';
import {collectBrowserTelemetry} from './browser-telemetry.mjs';
import {createReview} from './animation-review.mjs';
import {resolveNpmCli} from './npm-resolution.mjs';

const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export async function verifyAnimationPayload(directory=root){
 const base=path.join(directory,'vendor/pdoom-engine');
 const manifest=JSON.parse(await fs.readFile(path.join(base,'SOURCE-SHA256.json'),'utf8'));
 if(!Object.keys(manifest).length)throw Error('Empty animation source manifest');
 const files=[];
 async function walk(folder){for(const e of await fs.readdir(folder,{withFileTypes:true})){
  const p=path.join(folder,e.name);if(e.isSymbolicLink())throw Error('Animation payload symlinks are unsupported');
  if(e.isDirectory())await walk(p);else if(e.isFile())files.push(path.relative(base,p).split(path.sep).join('/'));
 }}
 if((await fs.lstat(base)).isSymbolicLink())throw Error('Animation payload symlinks are unsupported');
 await walk(base);
 const expected=[...Object.keys(manifest),'SOURCE-SHA256.json'].sort();
 if(JSON.stringify(files.sort())!==JSON.stringify(expected))throw Error('Animation payload membership differs from manifest');
 for(const [rel,hash] of Object.entries(manifest)){
  if(path.isAbsolute(rel)||rel.includes('\\')||rel.split('/').includes('..')||!/^[a-f0-9]{64}$/.test(hash))throw Error('Invalid animation source inventory');
  if(digest(await fs.readFile(path.join(base,rel)))!==hash)throw Error('Animation payload changed: '+rel);
 }
 return {directory:base,files:Object.keys(manifest).length,manifestSha256:digest(await fs.readFile(path.join(base,'SOURCE-SHA256.json')))};
}
export function validateAnimationName(name){
 if(!name||!/^[a-z0-9][a-z0-9-]{0,63}$/.test(name)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(name))throw Error('Use a lowercase project name such as my-video');
 return name;
}
async function workspace(name,directory=root,{create=false}={}){
 validateAnimationName(name);
 const project=path.join(resolveWorkspace(directory).projects,name),dir=path.join(project,'animation');
 const present=async target=>{try{return await fs.lstat(target);}catch(error){if(error.code==='ENOENT')return null;throw error;}};
 if(create){
  const projects=await present(resolveWorkspace(directory).projects);
  if(!projects||projects.isSymbolicLink())throw Error(`Create the video project first with: npm run new -- ${name}`);
  const projectStat=await present(project);
  if(!projectStat||projectStat.isSymbolicLink()||!projectStat.isDirectory())throw Error(`Video project not found or unsafe: projects/${name}. Create it first with: npm run new -- ${name}`);
  let manifest={};try{manifest=JSON.parse(await fs.readFile(path.join(project,'PROJECT.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  const native=path.join(project,manifest.nativeProject||'hyperframes');
  const nativeStat=await present(native);
  if(!nativeStat||nativeStat.isSymbolicLink()||!nativeStat.isDirectory())throw Error(`Native project is missing at projects/${name}/editor; do not create Animator source outside the video project folder.`);
  await fs.access(path.join(native,'index.html')).catch(()=>{throw Error(`Native project is incomplete: projects/${name}/editor/index.html is missing.`);});
  const legacyRoot=path.join(directory,'animation-projects');
  const legacy=await present(path.join(legacyRoot,name));
  if(legacy)throw Error(`An older animation workspace already exists at animation-projects/${name}. Resume that workspace or choose a new video project name; existing work was not moved.`);
  const current=await present(dir);
  if(current){
   if(current.isSymbolicLink()||!current.isDirectory())throw Error('Animation workspace must be a real directory inside its video project.');
   if((await fs.readdir(dir)).length)throw Error(`projects/${name}/animation already contains files. Refusing to overwrite or merge them.`);
  }else await fs.mkdir(dir);
  return dir;
 }
 const current=await present(dir);
 if(current){
  if(current.isSymbolicLink()||!current.isDirectory())throw Error('Animation workspace cannot be a symlink or non-directory.');
  await fs.access(path.join(dir,'ANIMATION-WORKSPACE.json')).catch(()=>{throw Error(`projects/${name}/animation has no animation workspace marker. Initialize it with: npm run animation -- new ${name}`);});
  return dir;
 }
 // Continue to support already-created rc.13 workspaces without moving them.
 const legacyRoot=path.join(directory,'animation-projects'),legacy=path.join(legacyRoot,name);
 const legacyParent=await present(legacyRoot),legacyStat=await present(legacy);
 if(legacyParent?.isSymbolicLink()||legacyStat?.isSymbolicLink())throw Error('Legacy animation workspace paths cannot be symlinks.');
 if(legacyStat){await fs.access(path.join(legacy,'ANIMATION-WORKSPACE.json'));return legacy;}
 throw Error(`No Animator workspace found for ${name}. Start a project with npm run new -- ${name}, then create its Animator source with npm run animation -- new ${name}.`);
}
export async function createAnimation(name,directory=root){
 const payload=await verifyAnimationPayload(directory),dir=await workspace(name,directory,{create:true});
 try{await fs.cp(payload.directory,dir,{recursive:true,errorOnExist:false});
  const brand=await materializeAnimationBrand(path.dirname(dir),dir);
  if(brand){const project=JSON.parse(await fs.readFile(path.join(path.dirname(dir),'PROJECT.json'),'utf8'));const format=validateProjectFormat(project.format);await fs.writeFile(path.join(dir,'app/projects/brand-showcase.json'),JSON.stringify({version:1,id:'brand-showcase',canvas:{width:format.width,height:format.height},colorMode:'flat',shots:[{id:'showcase',scene:'brand-showcase',duration:format.duration}]},null,2)+'\n');}
  await fs.writeFile(path.join(dir,'ANIMATION-WORKSPACE.json'),JSON.stringify({name,runtimeRelativeToAnimation:path.relative(dir,path.resolve(directory)),createdAt:new Date().toISOString(),sourceManifestSha256:payload.manifestSha256,videoProject:path.relative(path.resolve(directory,'..'),path.dirname(dir)),relativeToStudio:path.relative(path.resolve(directory,'..'),dir)},null,2)+'\n');
 }catch(error){await fs.writeFile(path.join(dir,'INITIALIZATION-FAILED.txt'),String(error));throw error;}
 return dir;
}
export async function animationDoctor(name,directory=root){
 const payload=await verifyAnimationPayload(directory);const report={payload:true,payloadFiles:payload.files,workspace:name??null,bun:false,media:false,chrome:null,launchVerified:false};
 const runtime=await runtimeEnvironment(directory);report.media=true;
 const chrome=process.env.PDOOM_CHROME|| (process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':process.platform==='win32'?path.join(process.env.PROGRAMFILES||'C:\\Program Files','Google/Chrome/Application/chrome.exe'):null);
 if(chrome)try{await fs.access(chrome);report.chrome=chrome;}catch{}
 if(name){const dir=await workspace(name,directory);const bun=path.join(dir,'app/node_modules/bun/bin/bun.exe');const p=spawnSync(bun,['--version'],{encoding:'utf8'});report.bun=!p.error&&p.status===0;if(report.bun)report.bunVersion=p.stdout.trim();}
 report.note='Browser path detection is not a render test. Pass --chrome /absolute/path/to/browser if Chrome is elsewhere. Run setup for a new animation workspace.';
 return report;
}
const help=`JStudio animation authoring (native Editor remains unchanged)
  npm run new -- <name>                         create the complete video project first
  npm run workflow -- <name> animation new               create Animator source inside its project
  npm run workflow -- <name> animation setup
  npm run workflow -- <name> animation update-engine [--apply]  plan/apply unchanged managed engine upgrade
  npm run workflow -- <name> animation doctor
  npm run workflow -- <name> animation render <video|stills|sheet|perf|gpu> --project projects/<config>.json [engine flags]
  npm run workflow -- <name> animation review --project projects/<config>.json --from 0 --to 6 [--fps 24] [--n 8] [--chrome /path]
Review creates a unique project reviews/animation revision (maximum 30 seconds); review is not approval.
New source: projects/<name>/animation/app/src/scenes; configs: app/projects.
Existing rc.13 source in animation-projects/<name> remains supported in place.
Use absolute output paths. New creates source only; setup installs pinned local dependencies.
Render supplies bundled FFmpeg; --chrome /absolute/path/to/browser selects a specific browser executable.
Stage current animation with --review-only for the complete native candidate. Default creative approval is once, on the encoded complete video.`;
export async function main(args=process.argv.slice(2),directory=root){
 const [action,name,...rest]=args;
 if(!action||action==='--help'||action==='help'){console.log(help);return;}
 if(action==='new'){console.log(await createAnimation(name,directory));return;}
 if(action==='doctor'){console.log(JSON.stringify(await animationDoctor(name,directory),null,2));return;}
 if(!['setup','render','review','update-engine'].includes(action))throw Error('Unknown animation command; use --help');
 let reportDirectory=studioHome(directory);
 try{validateAnimationName(name);const candidate=path.join(resolveWorkspace(directory).projects,name);await fs.access(path.join(candidate,'PROJECT.json'));reportDirectory=candidate;}catch{}
 return withRunReport({directory:reportDirectory,stage:'animation-'+action,details:{mode:action==='review'?'review-pack':rest[0]??null}},async()=>{
 if(action==='render'||action==='review')assertBrowserLaunchAllowed();
 await verifyAnimationPayload(directory);const dir=await workspace(name,directory);
 if(action==='update-engine'){if(rest.some(x=>x!=='--apply')||rest.length>1)throw Error('Use update-engine [--apply]');const payload=await verifyAnimationPayload(directory);const {updateAnimationEngine}=await import('./animation-engine-update.mjs');console.log(JSON.stringify(await updateAnimationEngine(dir,payload.directory,{apply:rest.includes('--apply')}),null,2));return;}
 if(action==='setup'){
  const [major,minor]=process.versions.node.split('.').map(Number);if(major<22||(major===22&&minor<12))throw Error('Animation engine requires Node22.12+');
  const npm=resolveNpmCli(process.execPath);
  await run(process.execPath,[npm,'ci','--no-audit','--no-fund'],{cwd:path.join(dir,'app'),env:{...process.env,PATH:[path.dirname(process.execPath),process.env.PATH||''].join(path.delimiter)}});return;
 }
 await verifyProjectBrandCopies(path.dirname(dir),{engine:'animation',animationRoot:dir});
 if(action==='review'){const runtime=await runtimeEnvironment(directory);const review=await createReview(dir,rest,{...runtime.env,STUDIO_GUARDED_ANIMATION_ROOT:dir});await verifyProjectBrandCopies(path.dirname(dir),{engine:'animation',animationRoot:dir});console.log(review);return;}
 if(!['video','stills','sheet','perf','gpu'].includes(rest[0]))throw Error('Choose video, stills, sheet, perf or gpu');
 if(!rest.includes('--project'))throw Error('Supply --project projects/<config>.json');
 const runtime=await runtimeEnvironment(directory);
 let attestation=null,provenance=null;
 if(rest[0]==='video'&&reportDirectory!==studioHome(directory)){
  provenance=await import(pathToFileURL(path.join(resolveWorkspace(directory).skills,'director/tools/animation-handoff.mjs')).href);
  if(rest.filter(arg=>arg==='--out').length!==1||rest.filter(arg=>arg==='--project').length!==1)throw Error('Video provenance requires exactly one --out and --project');
  const config=path.resolve(dir,'app',rest[rest.indexOf('--project')+1]);
  const configRelative=path.relative(reportDirectory,config).split(path.sep).join('/');
  const outIndex=rest.indexOf('--out');
  if(outIndex<0||!rest[outIndex+1]||!path.isAbsolute(rest[outIndex+1]))throw Error('Video provenance requires --out with an absolute new output path inside the video project');
  const media=path.relative(reportDirectory,rest[outIndex+1]).split(path.sep).join('/');
  attestation=provenance.beginAnimationRender(reportDirectory,media,rest);
  const chromeIndex=rest.indexOf('--chrome'),explicitChrome=chromeIndex>=0?rest[chromeIndex+1]:process.env.PDOOM_CHROME;
  const browserPath=explicitChrome||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':null);
  let browserHash=null;
  if(browserPath)try{browserHash=digest(await fs.readFile(browserPath));}catch{}
  attestation.execution={node:process.version,platform:process.platform,arch:process.arch,browser:{selection:explicitChrome?'explicit-executable':'playwright-channel-chrome',candidatePath:browserPath,executableSha256:browserHash,version:null,identityNote:explicitChrome?'Requested executable hash, when readable; no browser process attestation.':'Default candidate hash only; Playwright channel resolution is not attested. Browser version is unavailable without launch telemetry.'}};
  if(!attestation.inputs.some(file=>file.path===configRelative))throw Error('Render project configuration must be inside the inventoried animation source');
 }
 const {telemetry}=await collectBrowserTelemetry(async telemetryPath=>run(process.execPath,[path.join(dir,'render.mjs'),...rest],{cwd:dir,env:{...runtime.env,PDOOM_FFMPEG:runtime.env.HYPERFRAMES_FFMPEG_PATH,STUDIO_GUARDED_ANIMATION_ROOT:dir,STUDIO_BROWSER_TELEMETRY:telemetryPath}}));
 if(attestation)attestation.execution.effectiveBrowsers=telemetry;
 await verifyProjectBrandCopies(path.dirname(dir),{engine:'animation',animationRoot:dir});
 if(attestation)provenance.finishAnimationRender(reportDirectory,attestation);
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
